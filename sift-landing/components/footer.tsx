"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { IconBrandX } from "@tabler/icons-react";
import { IconBrandLinkedin } from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Footer = () => {
  const router = useRouter();
  return (
    <footer className="text-inherit border-t-2 bg-inherit pb-9">
      <div className="container mx-auto flex flex-col md:flex-row gap-y-4 justify-between pt-10 pb-10 items-start">
        <div className="flex flex-col items-start gap-y-2">
          <div className="flex items-center gap-x-4">
            <Image
              src="/sift_logo.png"
              alt="Sift Logo"
              className="block dark:hidden hover:cursor-pointer"
              width={40}
              height={40}
              onClick={() => router.push("/")}
            />
            <Image
              src="/sift_logo.png"
              alt="Sift Logo"
              className="hidden dark:block hover:cursor-pointer"
              width={40}
              height={40}
              onClick={() => router.push("/")}
            />
            <div className="flex flex-col gap-y-1">
              <h2 className="font-bold text-xl">Sift</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="flex flex-col gap-y-0 items-start justify-start">
            {/* <h1 className="font-bold text-sm pb-2">About</h1> */}
            {/* <ContactModal>
              <Button className="" variant="link">
                <p>Contact Us</p>
              </Button>
            </ContactModal> */}
            <Button
              onClick={() => {
                window.open("https://docs.opennote.me/about-us");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>About Us</p>
            </Button>
            <Button
              onClick={() => {
                window.open("https://docs.opennote.me/hiring");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Hiring</p>
            </Button>
          </div>

          <div className="flex flex-col gap-y-0 items-start justify-start">
            <Button
              onClick={() => {
                window.open("mailto:support@opennote.me");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Contact</p>
            </Button>
            <Button
              onClick={() => {
                window.open("https://docs.tuna.opennote.me");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Documentation</p>
            </Button>
            <Button
              onClick={() => {
                window.open("https://docs.tuna.opennote.me/changelog");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Patch Notes</p>
            </Button>
            {/* <Button
              onClick={() => {
                router.push("/terms");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Terms of Service</p>
            </Button>
            <Button
              onClick={() => {
                router.push("/data");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Data Usage Policy</p>
            </Button>
            <Button
              onClick={() => {
                router.push("/privacy");
              }}
              variant="link"
              className="text-muted-foreground font-light"
            >
              <p>Privacy Policy</p>
            </Button> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
