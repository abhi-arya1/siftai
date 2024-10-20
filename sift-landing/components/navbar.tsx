"use client";

import Image from "next/image";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Github, GithubIcon, Menu, Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { orbit } from "ldrs";

orbit.register();

const Navbar = () => {
  const [toggled, setToggled] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setToggled(theme === "dark");
  }, []);

  useEffect(() => {
    if (toggled) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, [toggled]);

  return (
    <div className="z-[9999] fixed top-0 w-full">
      <div
        className={`flex min-h-[40px] flex-row px-8 py-4 items-center justify-between duration-300 transition-all ${hasScrolled && "shadow-lg bg-background dark:shadow-neutral-900"}`}
      >
        <div className="flex flex-row gap-x-2 items-center">
          <Image
            src="/sift_logo.png"
            alt="SiftLogo"
            className="z-10 block dark:hidden hover:cursor-pointer"
            width={40}
            height={40}
            priority
            onClick={() => {
              router.push("/");
            }}
          />
          <Image
            src="/sift_logo.png"
            alt="SiftLogo"
            className="z-10 hidden dark:block hover:cursor-pointer"
            width={40}
            height={40}
            priority
            onClick={() => {
              router.push("/");
            }}
          />

          {/* <h1 className="font-semibold ml-3">Tuna</h1> */}
        </div>
        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem className="">
                <NavigationMenuLink
                  className={`${navigationMenuTriggerStyle()} cursor-pointer`}
                >
                  Devpost
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="https://github.com/abhi-arya1/tuna"
                  legacyBehavior
                  passHref
                >
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <GithubIcon className="h-5 w-5" />
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem className="">
                <Toggle
                  pressed={toggled}
                  onPressedChange={() => {
                    setToggled(!toggled);
                  }}
                >
                  {toggled ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Toggle>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex md:hidden z-[999999999] flex-row gap-x-4 items-center">
          <Toggle
            pressed={toggled}
            onPressedChange={() => {
              setToggled(!toggled);
            }}
          >
            {toggled ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Toggle>
          <DropdownMenu>
            <DropdownMenuTrigger className="mr-2">
              <Menu />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[9999999999999999]">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex flex-row">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  <span className="">Product</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-2 text-xs z-[9999999999]">
                    Coming Soon
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem>
                <Link href="/pricing" legacyBehavior passHref>
                  <a>Pricing</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href="https://docs.tuna.opennote.me"
                  legacyBehavior
                  passHref
                >
                  <a>Docs</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href="https://calendly.com/opennote/30min"
                  legacyBehavior
                  passHref
                >
                  <a>Book a Demo</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  window.open("https://github.com/abhi-arya1/tuna");
                }}
                className="text-muted-foreground flex flex-row gap-x-2"
              >
                <Github className="h-4 w-4" /> GitHub
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
