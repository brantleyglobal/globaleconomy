"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CustomIcon from "./assets/customIcon"; // Ensure it includes 'globe' & 'assets'

const BASE_TILE_SIZE = 190;
const CENTER_TILE_SIZE = 240;

const modules = [
  { name: "Redemption Engine", icon: "redemption", description: "Fair exits backed by reserves.", angle: 0 },
  { name: "Profit Flow", icon: "profitFlow", description: "Quarterly distributions tied to usage.", angle: 60 },
  { name: "Governance Layer", icon: "governance", description: "Stakeholder decisions through quorum voting.", angle: 120 },
  { name: "Partner Interfaces", icon: "partners", description: "Shared trust logic with modular onboarding.", angle: 180 },
  { name: "Sustainability", icon: "sustainability", description: "Low-energy infrastructure aligned with ESG goals.", angle: 240 },
  { name: "Smart Assets", icon: "assets", description: "Collateral-backed modules with real utility.", angle: 300 },
];

export default function EcosystemTab() {
  const [isMobile, setIsMobile] = useState(false);
  const [radius, setRadius] = useState(300); // Dynamic based on screen size

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(window.innerWidth < 768);
      setRadius(Math.min(window.innerWidth * 0.33, 300));
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  return (
    <div className="px-4 py-2 max-w-screen-2Xl mx-auto space-y-30 text-[color:var(--color-base-content)]">
      
      {/* 📖 Overview Section */}
      <section className="space-y-1">
        <h2 className="text-3xl font-thin text-white tracking-wide">SMART ECOSYSTEM</h2>
        <p className="text-zinc-300 text-sm leading-relaxed">
          This blockchain ecosystem is built on Hyperledger Besu QBFT, offering resilient governance, ESG-aligned protocols, and modular financial tools. 
          It integrates transparent redemption logic, equitable profit distribution, and partner-incentivized mechanics to foster trust at every layer. 
          Designed with user protection and sustainable growth in mind, it scales across networks while preserving clarity, accountability, and systemic fairness.
        </p>
      </section>

      {/* 🔄 Layout: Radial or Grid based on device */}
      <section className={isMobile ? "grid grid-cols-2 gap-6 justify-items-center" : "relative h-[700px]"}>
        
        {/* 🌍 Center Tile with Globe Icon */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full p-6 text-white font-semibold shadow-xl text-center"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              width: CENTER_TILE_SIZE,
              height: CENTER_TILE_SIZE,
            }}
          >
            <div className="flex flex-col justify-center items-center h-full space-y-2">
              <CustomIcon name="globe" size={48} />
              <span className="text-sm font-medium">Core Infrastructure</span>
            </div>
          </motion.div>
        )}

        {/* 💠 Radial Tiles */}
        {!isMobile &&
          modules.map(({ name, icon, description, angle }) => {
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: angle / 400 }}
                whileHover={{ scale: 1.05 }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 text-white backdrop-blur-sm flex flex-col justify-center items-center text-center space-y-2 shadow-md"
                style={{
                  top: `calc(50% + ${y}px)`,
                  left: `calc(50% + ${x}px)`,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "9999px",
                  width: `${BASE_TILE_SIZE}px`,
                  height: `${BASE_TILE_SIZE}px`,
                  padding: "1.5rem",
                }}
              >
                <CustomIcon name={icon} />
                <strong className="text-sm">{name}</strong>
                <p className="text-xs leading-tight">{description}</p>
              </motion.div>
            );
          })
        }

        {/* 📱 Grid Tiles for Mobile */}
        {isMobile &&
          modules.map(({ name, icon, description }) => (
            <motion.div
              key={name}
              whileHover={{ scale: 1.05 }}
              className="rounded-full w-[180px] h-[180px] flex flex-col justify-center items-center text-white bg-white/5 backdrop-blur-sm p-4 text-center shadow-md"
            >
              <CustomIcon name={icon} />
              <strong className="text-sm mt-2">{name}</strong>
              <p className="text-xs">{description}</p>
            </motion.div>
          ))
        }
      </section>

      {/* 🎯 CTA Section */}
      {/*<section className="space-y-3">
        <h3 className="text-xl font-semibold text-white">✨ Ready to Connect the Dots?</h3>
        <p className="text-zinc-300 text-sm leading-relaxed">
          Co-author the evolution—governance, ESG, and smart contracts that scale with purpose.
        </p>
        <div className="flex flex-wrap gap-4 mt-4">
          <button className="px-5 py-2 bg-[color:var(--color-accent)] text-white rounded hover:opacity-90">Partner Portal</button>
          <button className="px-5 py-2 bg-[color:var(--color-accent)] text-white rounded hover:opacity-90">Explore Governance</button>
          <button className="px-5 py-2 bg-[color:var(--color-accent)] text-white rounded hover:opacity-90">View Smart Contracts</button>
        </div>
      </section>*/}
    </div>
  );
}
