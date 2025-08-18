import React from "react";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

export const AssetImageGallery: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
}) => {
  if (!isOpen) return null;import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export const ImageGalleryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  images,
  selectedIndex,
  setSelectedIndex,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-base-100 rounded-xl shadow-lg w-[90%] max-w-5xl h-[80vh] flex relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 btn btn-sm btn-ghost border-none outline-none text-xl text-info hover:bg-base-300 z-10"
          aria-label="Close Modal"
        >
          &times;
        </button>

        {/* Left Panel — Thumbnails */}
        <div className="w-1/4 h-full p-4 border-r border-base-300 overflow-y-auto">
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Thumb ${idx}`}
              className={`mb-4 cursor-pointer rounded-md object-cover w-full h-24 transition-transform duration-150 hover:scale-105 ${
                selectedIndex === idx ? "ring ring-info" : ""
              }`}
              onClick={() => setSelectedIndex(idx)}
            />
          ))}
        </div>

        {/* Right Panel — Main Image w/ Zoom */}
        <div className="flex-grow p-6 flex items-center justify-center overflow-hidden">
          <div className="group relative">
            <img
              src={images[selectedIndex]}
              alt="..."
              className="rounded-lg max-h-full max-w-full shadow-md transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
            />
            {/* Optional tooltip or zoom overlay can go here */}
          </div>
        </div>
      </div>
    </div>
  );
};


  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="relative">
        <img
          src={imageSrc}
          alt="..."
          className="max-w-full max-h-[90vh] rounded-lg shadow-lg"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white rounded-full p-2 text-black hover:bg-gray-200 transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
