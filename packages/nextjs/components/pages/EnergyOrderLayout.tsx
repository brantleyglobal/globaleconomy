"use client";

import React, { useState } from "react";

export default function TheCurrent() {
  const [showE, setShowE] = useState(false);
  const [showX, setShowX] = useState(false);
  const [showRF, setShowRF] = useState(false);

  return (
    <main className="bg-black/20 w-full text-white font-sans">
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
          <div className="flex justify-center">
            <button
              onClick={() => setShowE(true)}
              className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 rounded-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
            >
              Explore Details
              <svg className="w-4 h-4 text-green animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 14.586V4a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
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
          <div className="flex justify-center">
            <button
              onClick={() => setShowX(true)}
              className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 rounded-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
            >
              Explore Details
              <svg className="w-4 h-4 text-green animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 14.586V4a1 1 0 011-1z" />
              </svg>
            </button>
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
          <div className="flex justify-center">
            <button
              onClick={() => setShowRF(true)}
              className="bg-white/10 animate-pulse backdrop-blur-md px-6 py-2 rounded-full text-sm text-white hover:bg-white/20 transition flex items-center gap-2 shadow-md"
            >
              Explore Details
              <svg className="w-4 h-4 text-green animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 14.586V4a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
        </div>
      </section>
      <SlidePanel
        isOpen={showE}
        onClose={() => setShowE(false)}
        title="LEGION E SERIES CLEAN ENERGY GENERATOR"
        description={`The LEGION E Series is a compact clean energy generator engineered for residential and small-scale applications, delivering 20–75KVA 
          of continuous power. Designed for off-grid living, remote installations, and grid-tied support, it offers a versatile solution for modern 
          energy independence. At its core is a proprietary turbine system that operates using a unique combination of media pressure differentials and 
          temperature gradients — including near-cryogenic environments — to generate power internally without combustion. This results in a no-emission,
          high-efficiency energy source that’s portable, mobile, or stationary as needed. While purpose-built for residential use, the E Series shows 
          potential in emerging sectors such as small-scale eVTOL infrastructure and micro-industrial deployments, where clean, modular power is critical.`}
      />

      <SlidePanel
        isOpen={showX}
        onClose={() => setShowX(false)}
        title="LEGION X SERIES CLEAN ENERGY GENERATOR"
        description={`The LEGION X Series is a compact clean energy generator engineered for commercial and EV applications, delivering 100–60OKVA 
          of continuous power. Designed for off-grid living, remote installations, and grid-tied support, it offers a versatile solution for modern 
          energy independence. At its core is a proprietary turbine system that operates using a unique combination of media pressure differentials and 
          temperature gradients — including near-cryogenic environments — to generate power internally without combustion. This results in a no-emission,
          high-efficiency energy source that’s portable, mobile, or stationary as needed. While purpose-built for residential use, the E Series shows 
          potential in emerging sectors such as small-scale eVTOL infrastructure and micro-industrial deployments, where clean, modular power is critical.`}
      />

      <SlidePanel
        isOpen={showRF}
        onClose={() => setShowRF(false)}
        title="TRANS GREENTECH RENEWABLE FUEL"
        description={`This renewable fuel is derived from a saltwater algae species known for its exceptional lipid yield. Cultivation 
          occurs in photobioreactors with precise control over light, temperature, and nutrient cycles. Harvesting uses a multi-phase Dissolved Air 
          Flotation (DAF) system to remove salts and microbial contaminants. The biomass is dewatered into a slurry, then dried centrifugally before 
          entering a CO₂-based lipid extraction process. Approximately 80% of the oil is extracted; the remaining biomass is repurposed for feedstock, 
          nutraceuticals, and other applications. A water reclamation system recovers salts and minerals, which are reintroduced via sensor-driven 
          dosing throughout the growth cycle. This closed-loop process minimizes waste and supports scalable, sustainable fuel production for 
          resource-constrained environments.`}

      />
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

function SlidePanel({
  isOpen,
  onClose,
  title,
  description,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 w-full z-50 bg-black/90 text-white px-6 py-8 transition-transform duration-500 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-light">{title}</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition duration-300"
            aria-label="Close panel"
          >
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-justify text-gray-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
