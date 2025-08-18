"use client";

import React from "react";
import {
  FaShieldAlt,
  FaBriefcase,
  FaGlobe,
  FaCogs,
  FaChartLine,
  FaGem,
  FaLeaf,
  FaUsers,
} from "react-icons/fa";

const iconMap = {
  besu: <FaCogs />,
  governance: <FaShieldAlt />,
  redemption: <FaBriefcase />,
  profitFlow: <FaChartLine />,
  partners: <FaUsers />,
  sustainability: <FaLeaf />,
  globe: <FaGlobe />, //Added globe icon here
  assets: <FaGem />, // Optional placeholder for Smart Assets
};

const CustomIcon = ({ name, size = 24 }) => {
  return (
    <div style={{ fontSize: `${size}px`, marginBottom: "8px" }}>
      {iconMap[name] || null}
    </div>
  );
};

export default CustomIcon;
