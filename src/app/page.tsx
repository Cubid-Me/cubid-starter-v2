'use client';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black font-poppins">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-transparent">
        <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow-lg">
          Cubid Starter
        </h1>
        <Link href="/login">
          <Button
            variant="outline"
            className="border-none text-white bg-white/10 hover:bg-white/100 font-semibold transition-all duration-300 px-6 py-2 rounded-full shadow-md shadow-white/20"
          >
            Login
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center flex-grow p-8 sm:p-20">
        <Card className="w-full max-w-xl p-6 text-center bg-white/10 backdrop-blur-lg rounded-3xl shadow-xl transition-transform duration-300">
          <CardHeader>
            <CardTitle className="text-5xl font-extrabold text-transparent text-white drop-shadow-md">
              Welcome to Cubid Starter
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 mt-6">
            <img
              src="https://plus.unsplash.com/premium_photo-1675598468968-97a909cc7a7e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzN8fHRlY2glMjBsb2dvfGVufDB8fDB8fHww"
              alt="Cubid logo"
              className="drop-shadow-lg rounded-full w-[160px] h-[160px] border-4 border-white/20"
            />
            <p className="text-lg text-white/80 font-medium">
              Get started with your Cubid development journey!
            </p>
            <div className="flex gap-4 mt-8 w-full">
              <Button
                variant="outline"
                className="w-full py-3 font-bold text-black hover"
                onClick={() => {
                  window.open("https://docs.cubid.me/#/");
                }}
              >
                Cubid Docs
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
