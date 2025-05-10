"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const user = {};

const Navbar = () => {
  const router = useRouter();
  return (
    <header className="navbar">
      <nav>
        <Link href={"/"}>
          <Image
            src="/assets/icons/logo.svg"
            alt="Logo"
            width={32}
            height={32}
          />
          <h1>SnapCast</h1>
        </Link>

        {user && (
          <figure>
            <button onClick={() => router.push(`/profile/12345`)}>
              <Image
                src="/assets/images/dummy.jpg"
                alt="User"
                width={36}
                height={36}
                className="rounded-full aspect-square"
              />
            </button>

            <button className="cursor-pointer ">
              <Image
                src={"/assets/icons/logout.svg"}
                alt="Logout"
                height={24}
                width={24}
                className="rotate-180"
              />
            </button>
          </figure>
        )}
      </nav>
    </header>
  );
};
export default Navbar;
