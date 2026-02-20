"use client";

import React, { useState } from "react";
import Image from "next/image";

const projects = [
  {
    key: "smartgrid",
    title: "THE GLOBE",
    status: "Planned",
    description: `The Globe will aid BG Company’s pursuits. It is a forward-thinking mixed-use development that 
      brings unique and genuine cultural themes from around the world into a single development. Featuring a mix of 
      residential and commercial spaces catering to the evolving live-work-play lifestyle, the completely walkable 
      commercial aspect consists of shops and restaurants that incorporate cuisine and customs from around the globe 
      with fitting settings. The second component entails development of a commercial/light industrial facility 
      designed to facilitate R&D, client demonstrations, and administrative functions. Encapsulating BG Company’s 
      efforts within a mixed-use theme provides a magnetic experience for the local community as well as a unique 
      clientele. It is the UN of the NEW ENERGY ORDER.`,
    images: [
      "/assets/images/glb-project.png",
      "/assets/images/glb-project2.png",
      "/assets/images/glb-project3.png",
      "/assets/images/glb-project4.png",
    ],
  },
  {
    key: "carbon",
    title: "TRANS GREENTECH RENEWABLE OIL CULTIVATION & DISTRIBUTION HUB",
    status: "Planned",
    description: `Servicing multiple markets, using algae to produce biofuel, valuable feed & nutraceuticals, and fertilizer. 
      Supported by practices that are environmentally friendly, technology driven, economically profitable, and address several 
      growing concerns. Using reverse water treatment practices, hydro-processing, and CO2 extraction in tandem with today’s automation 
      & controls and business applications, operations will cultivate, harvest, and process algae to produce algal oil 
      which will be refined and marketed as middle distillate biofuel; and biomass which will be marketed as animal feed products, organic 
      fertilizer, and dietary supplements. Modeled similar to farms producing alternative fuels from the cultivation of crops, Trans GreenTech 
      will develop 70 acres, dedicated to the cultivation, processing, and storage of algal based products with an initial production capability 
      of over 90,000 tons of quality algal biomass derived products per acre annually. In terms of competition, upon completion, Proposing an 
      adjustable production range minimum 70,000- 500,000 bpd. Well over 16 million gallons of biofuel per acre per annum.`,
    images: [
      "/assets/images/tg-project.png",
      "/assets/images/tg-project2.png",
      "/assets/images/tg-project3.png",
      "/assets/images/tg-project4.png",
      "/assets/images/tg-project5.png",
    ],
  },
];

export default function ProposedDevelopments() {
  return (
    <main className="bg-black text-white min-h-screen font-sans flex flex-col h-full">
      {/* Hero */}
      <section className="py-16 text-center border-b border-white/10">
        <h1 className="text-2xl sm:text-4xl font-light tracking-wide mb-4 text-primary">
        PROPOSED DEVELOPMENTS
        </h1>
        <p className="text-gray-400">Not just talking about the future, but creating it.</p>
        <div className="mt-6 flex justify-center">
          <span className="w-24 h-1 bg-primary/60 rounded-full"></span>
        </div>
      </section>

      {/* Project Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 px-4 md:px-6">
        {projects.map((project) => (
          <ThumbnailGallery key={project.key} project={project} />
        ))}
      </div>
    </main>
  );
}

function ThumbnailGallery({ project }: { project: any }) {
  const [mainImage, setMainImage] = useState(project.images[0]);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-white/5 w-full p-6 rounded-lg shadow-md flex flex-col gap-4">
      {/* Main Image */}
      <div
        className="relative aspect-video rounded-md overflow-hidden cursor-pointer"
        onClick={() => setModalOpen(true)}
      >
        <Image src={mainImage} alt={project.title} fill className="object-cover" />
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 overflow-x-auto">
        {project.images.map((img: string, idx: number) => (
          <div
            key={idx}
            className={`relative h-16 w-24 sm:h-20 sm:w-32 rounded-md overflow-hidden cursor-pointer ${
              img === mainImage ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setMainImage(img)}
          >
            <Image src={img} alt={`${project.title} ${idx + 1}`} fill className="object-cover" />
          </div>
        ))}
      </div>

      {/* Description */}
      <h2 className="text-xl sm:text-2xl font-light text-primary">{project.title}</h2>
      <p className="text-sm sm:text-base text-gray-300 text-justify">{project.description}</p>
      <div className="mt-auto">
        <span className="text-xs text-gray-400">Status: {project.status}</span>
      </div>

      {/* Modal Gallery */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-white/20">
            <h2 className="text-lg font-light">{project.title} Gallery</h2>
            <button
              onClick={() => setModalOpen(false)}
              className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-4 flex-wrap justify-center p-6 overflow-y-auto">
            {project.images.map((img: string, idx: number) => (
              <div key={idx} className="relative w-40 h-28 sm:w-72 sm:h-48 rounded-md overflow-hidden">
                <Image src={img} alt={`${project.title} ${idx + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}