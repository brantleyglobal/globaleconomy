// components/storeFrontBanner.tsx
export const Banner = () => {
  return (
    <div className="bg-transparent border-b border-black/10 shadow-white py-8 px-4 md:px-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      
      {/* Left Side: Heading */}
      <div className="text-left md:w-1/3">
        <h1 className="text-3xl md:text-4xl font-light text-primary">
          ENERGY REDEFINED
        </h1>
        <p className="text-sm font-light text-primary">
          Energy solutions backed by blockchain technology
        </p>
      </div>

      {/* Center Image */}
      {/*<div className="w-full md:w-1/3 flex items-center justify-center">
        <div className="w-full h-20 flex items-center justify-center rounded-md shadow-md bg-transparent p-2">
          {/* <img src="/Banner.png" alt="Generator" className="object-contain h-full w-full" /> */}
        {/*</div>
      </div>*/}

      {/* GBDO Coin Display */}
      {/*<div className="flex items-center border-white/5 gap-2 bg-black px-3 py-1 rounded-md shadow-md md:mr-3">*/}
        {/* <img src="/globalw.png" className="w-10 h-10" alt="GBDO Coin" /> */}
        {/*<span className="text-sm text-white font-light"></span>
      </div>*/}

      {/* Right Side: Blockchain Panel */}
    </div>
  );
};
