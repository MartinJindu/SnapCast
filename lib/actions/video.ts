"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { apiFetch, getEnv, withErrorHandling } from "../utils";
import { BUNNY } from "@/constants";
import { db } from "@/drizzle/db";
import { videos } from "@/drizzle/schema";
import { revalidatePath } from "next/cache";
import aj from "../arcject";
import { fixedWindow, request } from "@arcjet/next";

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
