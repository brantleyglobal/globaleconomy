"use client";

import React from "react";

export default function TheCurrent() {
  return (
    <main className="bg-black/20 text-white font-sans">
      {/* Hero Section */}
      <section className="h-screen sm:h-[90vh] flex flex-col items-center justify-center text-center relative overflow-hidden px-4">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/Legion Energy OrderE.mp4"
        />
        <div className="relative z-10 px-6">
          <h1 className="text-4xl font-light tracking-wide mb-4">LEGION E SERIES CLEAN ENERGY GENERATOR</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Continuous energy created for remote residential, off grid, grid tie, & mobile use.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="h-6 w-full bg-black/90 animate-pulse" />

      <div className="absolute bottom-6 z-20 text-sm text-gray-400 animate-bounce">
        Scroll to explore ↓
      </div>

      <section className="h-screen sm:h-[90vh] flex flex-col items-center justify-center text-center relative overflow-hidden px-4">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/Legion Energy OrderX.mp4"
        />
        <div className="relative z-10 px-6">
          <h1 className="text-4xl font-light tracking-wide mb-4">LEGION X SERIES CLEAN ENERGY GENERATOR</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Continuous energy created for remote development, natural disaster prone regions, & EV arenas.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="h-6 w-full bg-black/90 animate-pulse" />

      <div className="absolute bottom-6 z-20 text-sm text-gray-400 animate-bounce">
        Scroll to explore ↓
      </div>

      <section className="h-screen sm:h-[90vh] flex flex-col items-center justify-center text-center relative overflow-hidden px-4">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/emblemDance.mp4"
          onLoadedMetadata={e => {
            e.currentTarget.playbackRate = 0.25;
          }}
        />
        <div className="relative z-10 px-6">
          <h1 className="text-4xl font-light tracking-wide mb-4">RENEWABLE FUEL</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Renewable Fuel Alternative providing drop-in fuel solutions developed for resource restricted regions.
          </p>
        </div>
      </section>
    </main>
  );
}

function VideoNode({
  title,
  src,
  description,
  align,
}: {
  title: string;
  src: string;
  description: string;
  align: "left" | "right" | "center";
}) {
  const alignmentStyles =
    align === "left"
      ? "self-start w-[90%] sm:w-[80%]"
      : align === "right"
      ? "self-end w-[90%] sm:w-[80%]"
      : "self-center w-full";

  return (
    <div className={`${alignmentStyles} flex flex-col gap-4`}>
      <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <div className="px-2">
        <h2 className="text-xl font-semibold mb-1">{title}</h2>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
