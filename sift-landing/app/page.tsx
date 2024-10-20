import Content from "@/components/content";
import Footer from "@/components/footer";
import Hero from "@/components/hero";

import dynamic from "next/dynamic";
const Navbar = dynamic(() => import("@/components/navbar"), {
  ssr: false,
});

export default function Home() {
  return (
    <div>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <Navbar />
        {/* <div className="absolute h-[200vw] max-h-[2000px] md:max-h-[1000px] lg:max-h-[1000px] left-0 right-0 top-0 lg:top-0 md:top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />  */}
        <Hero />
        <Content />
      </main>
      <Footer />
    </div>
  );
}
