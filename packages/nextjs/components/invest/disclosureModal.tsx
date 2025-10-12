import React, { useState } from "react";
import DOMPurify from "dompurify";

type DisclosureSection = {
  id: string;
  label: string;
  content: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sections: DisclosureSection[];
};

export const DisclosureModal: React.FC<Props> = ({ isOpen, onClose, sections }) => {
  const [activeTab, setActiveTab] = useState(sections[0]?.id || "");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
      <div className="bg-black text-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-sm hover:text-primary"
        >
          ✕
        </button>

        <h2 className="text-lg font-light mb-4">Investment Disclosure</h2>

        {/* Mobile Dropdown */}
        <div className="md:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="select rounded-md bg-[#09120b] w-full text-info-600 mb-4 outline-none hover:bg-white/10 border-none focus:ring-0 focus:outline-none"
          >
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>
                {sec.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden md:flex space-x-4 border-b border-white/20 mb-4 overflow-x-auto">
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`text-sm px-3 py-2 whitespace-nowrap ${
                activeTab === sec.id ? "border-b-2 border-primary text-primary" : "text-info-600"
              }`}
              onClick={() => setActiveTab(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>

        <div className="max-h-64 overflow-y-auto text-sm text-info-600 text-justify">
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                sections.find(s => s.id === activeTab)?.content || "<p>Loading…</p>"
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};
