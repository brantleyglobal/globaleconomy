import React from "react";

export const ProjectPreview = ({
  title,
  description,
  image,
  pdf,
}: {
  title: string;
  description: string;
  image?: string;
  pdf: string;
}) => (
  <div className="bg-black border border-white/10 rounded-xl p-4 space-y-4">
    <h3 className="text-lg font-light text-white">{title}</h3>
    {image && (
      <img
        src={image}
        alt="Project preview"
        className="rounded-md w-full object-cover"
      />
    )}
    <div className="text-white/50 text-justify text-sm whitespace-pre-line">
      {description}
    </div>
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
