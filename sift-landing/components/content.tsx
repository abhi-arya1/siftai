"use client";
import Image from "next/image";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { PlugZap, LockKeyhole, Blend, SearchCheck } from "lucide-react";
import Marquee from "@/components/ui/marquee";
import { FcGoogle } from "react-icons/fc";
import { SiSlack, SiDiscord, SiGoogle, SiNotion } from "react-icons/si";
import { cn } from "@/lib/utils";
import ShinyButton from "@/components/ui/shiny-button";
import SparklesText from "@/components/ui/sparkles-text";
import Meteors from "@/components/ui/meteors";
import Link from "next/link";
import { useTheme } from "next-themes";

const integrations = [
  { name: "Slack", icon: SiSlack },
  { name: "Discord", icon: SiDiscord },
  { name: "Google", icon: SiGoogle },
  { name: "Notion", icon: SiNotion },
];

const Content = () => {
  const { theme, setTheme } = useTheme();

  const features = [
    {
      Icon: SearchCheck,
      name: "Never Lose Anything Again",
      description:
        "All of your files across all platforms and services, all in one place.",
      href: "https://github.com/abhi-arya1/siftai",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-1 w-full",
      background: <Meteors number={30} />,
    },
    {
      Icon: PlugZap,
      name: "Supercharge Your Workflow",
      description:
        "Real-time natural language querying and autocompletion so you can worry less about annoying filenames and more on what matters.",
      href: "https://github.com/abhi-arya1/siftai",
      cta: "Get Started",
      className: "col-span-3 lg:col-span-2 w-full",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
    },
    {
      Icon: LockKeyhole,
      name: "Safe With You",
      description:
        "All files and resources are saved directly on your device, making Sift lightweight, secure, and lightning fast.",
      href: "https://github.com/abhi-arya1/siftai",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-2 w-full",
      background: <img className="absolute -right-20 -top-20 opacity-60" />,
    },
    {
      Icon: Blend,
      name: "App Integrations",
      description:
        "Seamlessly query any social platforms and productivity tools.",
      href: "https://github.com/abhi-arya1/siftai",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-1 w-full",
      background: (
        <Marquee
          pauseOnHover
          className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_20%,#000_80%)]"
        >
          {integrations.map((integration, idx) => (
            <figure
              key={idx}
              className={cn(
                "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4 mx-2",
                "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
                "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none",
              )}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <integration.icon size={32} />
              </div>
            </figure>
          ))}
        </Marquee>
      ),
    },
  ];

  return (
    <div className="mt-44 z-10 flex flex-col items-center gap-y-40 justify-center w-full md:w-[75%] px-4 mb-16">
      <div className="flex flex-col items-center justify-center">
        {/* <div className="pb-16 w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 mb-20">
          <div className="flex flex-col items-center justify-center pb-8">
            <SparklesText
              className="pb-8 text-center"
              text="Never Lose Anything Again."
            ></SparklesText>
            <span className="text-sm md:text-base text-muted-foreground font-semibold justify-center items-center text-center">
              FIND ANY FILE OR ITEM ON YOUR COMPUTER OR SOCIAL PLATFORMS. <br />
            </span>
          </div>
        </div> */}
        <div>
          <SparklesText
            className="pb-8 text-center"
            text="Try Sift Today."
          ></SparklesText>
          <a
            href="https://github.com/abhi-arya1/siftai"
            className="flex items-center justify-center"
          >
            <ShinyButton text="Github" className="mb-8"></ShinyButton>
          </a>
          <BentoGrid className="w-full pb-20">
            {features.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
      {/* <div className="flex flex-col items-center justify-center pb-20"> */}
      {/* <SparklesText
          className="text-center"
          text="Proudly Open-Source."
        ></SparklesText>
        <span className="text-sm font-semibold text-muted-foreground text-center pt-4">
          TUNA IS COMMITTED TO OFFERING OPEN SOURCE SOFTWARE. <br />
          YOU CAN EITHER USE OUR SERVERS ON PRO TIER, OR INSTALL AND RUN LOCALLY
          AND SELF-HOST.
        </span>
        <div className="flex items-center justify-center pt-4 gap-x-4">
          <a
            target="_blank"
            href="https://github.com/abhi-arya1/tuna"
            className=""
          >
            <ShinyButton text="Github" className="align-middle"></ShinyButton>
          </a>
          <a
            target="_blank"
            href="http://docs.tuna.opennote.me/self-hosting"
            className=""
          >
            <ShinyButton
              text="Self-Host"
              className="align-middle"
            ></ShinyButton>
          </a>
        </div> */}
      {/* </div> */}

      {/* <div className="w-full flex flex-col items-center justify-center gap-y-20">
        <SparklesText
          className="text-center"
          text="Save Your Time and Money."
        ></SparklesText>
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          {statistics.map((stat, idx) => (
            <Statistic
              key={idx}
              value={stat.value}
              label={stat.label}
              isPercentage={stat.isPercentage}
              isPlus={stat.isPlus}
            />
          ))}
        </div>
      </div> */}

      {/* <div className="w-full flex flex-col items-center justify-center">
        <SparklesText
          className="text-center"
          text="Try Tuna Today."
        ></SparklesText>
        <h3 className="font-normal text-lg text-muted-foreground text-center pt-4">What are you waiting for?</h3>
        <div className="pt-6">
          <ShinyButton
            className="align-middle"
            text="Get Started"
          ></ShinyButton>
        </div>
      </div> */}
    </div>
  );
};

export default Content;
