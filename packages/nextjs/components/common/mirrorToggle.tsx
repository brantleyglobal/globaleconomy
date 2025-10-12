import { useRouter, usePathname } from "next/navigation";

export default function MirrorModeToggle() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith("/dashboard");
  const isStorefront = pathname?.startsWith("/");

  return (
    <section className="hover:bg-transparent z-1 relative bg-transparent active:!bg-transparent">
      <div className="overflow-x-auto rounded-md">
        <table className="w-full text-xs border-collapse bg-transparent">
          <tbody>
            <tr>
              <td>
                <button
                  onClick={() => router.push("/dashboard")}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`w-full h-full px-4 py-2 cursor-pointer text-left 
                    bg-transparent hover:bg-base-300 
                    active:!bg-transparent focus:outline-none focus:ring-0 
                    transition-none ${
                      isDashboard ? "bg-white/10 text-white" : ""
                    }`}
                >
                  DASHBOARD
                </button>
              </td>
              <td>
                <button
                  onClick={() => router.push("/")}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`w-full h-full px-4 py-2 cursor-pointer text-left 
                    bg-transparent hover:bg-base-300 
                    active:!bg-transparent focus:outline-none focus:ring-0 
                    transition-none ${
                      isStorefront ? "bg-white/10 text-white" : ""
                    }`}
                >
                  STOREFRONT
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
