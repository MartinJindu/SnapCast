"use client";

import { authClent } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";

const Auth = () => {
  const handleSignIn = async () => {
    return await authClent.signIn.social({ provider: "google" });
  };

  return (
    <main className="sign-in">
      <aside className="testimonial">
        <Link href={"/"}>
          <Image
            src={"/assets/icons/logo.svg"}
            alt="logo"
            height={32}
            width={32}
          />
          <h1>SnapCast</h1>
        </Link>
        <div className="description">
          <section>
            <figure>
              {Array.from({ length: 5 }).map((_, i) => (
                <Image
                  src={"assets/icons/star.svg"}
                  alt="star"
                  width={20}
                  height={20}
                  key={i}
                />
              ))}
            </figure>
            <p>
              SnapCast makes stream recording easy. From quick walkthrough to
              full presentation, it's fast, smooth, and shareable in seconds
            </p>
            <article>
              <Image
                src={"/assets/images/jason.png"}
                alt="jason"
                height={64}
                width={64}
                className="rounded-full"
              />
              <div>
                <h2>Jason Rivera</h2>
                <p>Product Designer, NovaBytes</p>
              </div>
            </article>
          </section>
        </div>
        <p>SnapCast {new Date().getFullYear()}</p>
      </aside>

      <aside className="google-sign-in">
        <section>
          <Link href={"/"}>
            <Image
              src={"/assets/icons/logo.svg"}
              alt="logo"
              height={40}
              width={40}
            />
            <h1>SnapCast</h1>
          </Link>
          <p>
            Create and share your very first <span>SnapCast video</span> in no
            time!
          </p>
          <button onClick={handleSignIn}>
            <Image
              src={"assets/icons/google.svg"}
              alt="google"
              width={32}
              height={32}
            />
            <span>Sign in with Google</span>
          </button>
        </section>
      </aside>
      <div className="overlay" />
    </main>
  );
};
export default Auth;
