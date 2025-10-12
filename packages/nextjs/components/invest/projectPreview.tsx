// src/components/ProjectPreview.tsx

import React from "react";

export const ProjectPreview = ({
  title,
  description,
  image,
  pdf,
}: {
  title: string;
  description: string;
  image: string;
  pdf: string;
}) => (
  <div className="bg-black border border-white/10 rounded-xl p-4 space-y-4">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <img src={image} alt={title} className="rounded-md w-full object-cover" />
    <p className="text-white/50 text-sm">{description}</p>
    <a
      href={pdf}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-sm bg-secondary/20 text-white hover:bg-secondary/40 rounded-md"
    >
      View Full Project PDF
    </a>
  </div>
);
