"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import {
  apiFetch,
  doesTitleMatch,
  getEnv,
  getOrderByClause,
  withErrorHandling,
} from "../utils";
import { BUNNY } from "@/constants";
import { db } from "@/drizzle/db";
import { user, videos } from "@/drizzle/schema";
import { revalidatePath } from "next/cache";
import aj from "../arcject";
import { fixedWindow, request } from "@arcjet/next";
import { and, eq, or, sql } from "drizzle-orm";

const VIDEO_STREAM_BASE_URL = BUNNY.STREAM_BASE_URL;
const THUMBNAIL_STORAGE_BASE_URL = BUNNY.STORAGE_BASE_URL;
const THUMBNAIL_CDN_URL = BUNNY.CDN_URL;
const BUNNY_LIBRARY_ID = getEnv("BUNNY_LIBRARY_ID");
const ACCESS_KEYS = {
  streamAccessKey: getEnv("BUNNY_STREAM_ACCESS_KEY"),
  storageAccessKey: getEnv("BUNNY_STORAGE_ACCESS_KEY"),
};

// ...........helper func....................
const getSessionUserId = async (): Promise<string> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) throw new Error("Unauthenticated");

  return session.user.id;
};

// return select video from db
const buildVideoWithUserQuery = () => {
  return db
    .select({
      video: videos,
      user: { id: user.id, name: user.name, image: user.image },
    })
    .from(videos)
    .leftJoin(user, eq(videos.userId, user.id));
};

const revalidatePaths = (paths: string[]) => {
  paths.forEach((path) => revalidatePath(path));
};

/**
 * Validator func using Arcjet
 * @param fingerprint allows to know the connected user
 */
const validateWithArcjet = async (fingerprint: string) => {
  const rateLimit = aj.withRule(
    // rate limiting server actions.
    fixedWindow({
      mode: "LIVE",
      // time window
      window: "1m",
      // max request per window i.e 1 request per mins
      max: 2,
      characteristics: ["fingerprint"],
    })
  );

  const req = await request(); // from arject/next

  // protecting request that user is making and connecting the fingerprint adoptions
  const decision = await rateLimit.protect(req, { fingerprint });

  if (decision.isDenied()) {
    throw new Error("Rate limit exceeded");
  }
};

// ..............Server func....................................
/**
 * Get the video uploaded url
 */
export const getVideoUploadUrl = withErrorHandling(async () => {
  await getSessionUserId();

  const videoResponse = await apiFetch<BunnyVideoResponse>(
    `${VIDEO_STREAM_BASE_URL}/${BUNNY_LIBRARY_ID}/videos`,
    {
      method: "POST",
      bunnyType: "stream",
      body: { title: "Temporary Title", collectionId: "" },
    }
  );

  const uploadUrl = `${VIDEO_STREAM_BASE_URL}/${BUNNY_LIBRARY_ID}/videos/${videoResponse.guid}`;

  return {
    videoId: videoResponse.guid,
    uploadUrl,
    accessKey: ACCESS_KEYS.streamAccessKey,
  };
});

/**
 * Get the thumbnail uploaded url
 */
export const getThumbnails = withErrorHandling(async (videoId: string) => {
  const fileName = `${Date.now()}-${videoId}-thumbnail`;
  const uploadUrl = `${THUMBNAIL_STORAGE_BASE_URL}/thumbnails/${fileName}`;
  const cdnUrl = `${THUMBNAIL_CDN_URL}/thumbnails/${fileName}`;

  return {
    uploadUrl,
    cdnUrl,
    accessKey: ACCESS_KEYS.storageAccessKey,
  };
});

// func to attach user with the video details
export const saveVideoDetails = withErrorHandling(
  async (videoDetails: VideoDetails) => {
    const userId = await getSessionUserId();
    // validating user req with arcjet
    await validateWithArcjet(userId);

    await apiFetch(
      `${VIDEO_STREAM_BASE_URL}/${BUNNY_LIBRARY_ID}/videos/${videoDetails.videoId}`,
      {
        method: "POST",
        bunnyType: "stream",
        body: {
          title: videoDetails.title, // coming from form on the front-end
          description: videoDetails.description,
        },
      }
    );
    // adding video and user data to db
    await db.insert(videos).values({
      ...videoDetails,
      videoUrl: `${BUNNY.EMBED_URL}/${BUNNY_LIBRARY_ID}/${videoDetails.videoId}`,

      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePaths(["/"]);

    return {
      videoId: videoDetails.videoId,
    };
  }
);

// get all videos
export const getAllVideos = withErrorHandling(
  async (
    searchQuery: string = "",
    sortFilter?: string,
    pageNumber: number = 1,
    pageSize: number = 8
  ) => {
    const session = await auth.api.getSession({ headers: await headers() });

    const currentUserId = session?.user.id;

    // user can see public videos or video they created them self. they can't see private video
    const canSeeTheVideos = or(
      eq(videos.visibility, "public"),
      eq(videos.userId, currentUserId!)
    );

    // where condition for db
    const whereCondition = searchQuery.trim()
      ? and(canSeeTheVideos, doesTitleMatch(videos, searchQuery))
      : canSeeTheVideos;

    // getting totalCount of video with the where condition from videos in the db
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)` })
      .from(videos)
      .where(whereCondition);

    const totalVideos = Number(totalCount || 0);
    const totalPages = Math.ceil(totalVideos / pageSize);

    const videoRecords = await buildVideoWithUserQuery()
      .where(whereCondition)
      .orderBy(
        sortFilter
          ? getOrderByClause(sortFilter)
          : sql`${videos.createdAt} DESC`
      )
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize);

    return {
      videos: videoRecords,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalVideos,
        pageSize,
      },
    };
  }
);

// get single video details
export const getVideoById = withErrorHandling(async (videoId: string) => {
  const [videoRecord] = await buildVideoWithUserQuery().where(
    eq(videos.id, videoId)
  );

  return videoRecord;
});
