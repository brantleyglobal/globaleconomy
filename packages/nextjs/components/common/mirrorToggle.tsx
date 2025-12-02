import { useRouter, usePathname } from "next/navigation";

export default function MirrorModeToggle() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith("/dashboard");
  const isStorefront = pathname === "/";

  return (
    <div className="inline-flex rounded-md overflow-hidden 
                    bg-white/10 backdrop-blur-md shadow-md">
      <button
        onClick={() => router.push("/dashboard")}
        onMouseDown={(e) => e.preventDefault()}
        className={`px-4 py-2 text-xs transition 
          ${isDashboard 
            ? "bg-white/20 text-white" 
            : "text-gray-300 hover:bg-white/5"}`
        }
      >
        DASHBOARD
      </button>
      <button
        onClick={() => router.push("/")}
        onMouseDown={(e) => e.preventDefault()}
        className={`px-4 py-2 text-xs transition 
          ${isStorefront 
            ? "bg-white/20 text-white" 
            : "text-gray-300 hover:bg-white/5"}`
        }
      >
        STOREFRONT
      </button>
    </div>
  );
}
