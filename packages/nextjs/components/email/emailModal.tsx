"use client";
import React, { useRef, useState } from "react";
import dynamic from "next/dynamic"; // Add this if it's missing


const Modal = dynamic(() =>
  import("~~/components/common/modal").then(mod => mod.Modal),
  { ssr: false }
);


type EmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose }) => {
   const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!formRef.current) {
      setIsSubmitting(false);
      return;
    }
    const formData = new FormData(formRef.current);
    const from_firstname = formData.get("from_firstname") as string;
    const from_lastname = formData.get("from_lastname") as string;
    const from_subject = formData.get("from_subject") as string;
    const from_email = formData.get("from_email") as string;
    const message = formData.get("message") as string;
    
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "sendEmail",
          params: {
            templateType: "general",
            from_firstname,
            from_lastname,
            email: from_email,
            from_subject,
            message,
          },
          id: Date.now(),
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      alert("Message sent successfully!");
      onClose();
    } catch (error: any) {
      console.error("Email send error:", error);
      alert("Failed to send message, please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="EMAIL US" isOpen={isOpen} onClose={onClose}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 text-base font-light text-white max-w-lg mx-auto p-4"
      >
        <input
          type="text"
          name="from_firstname"
          required
          placeholder="First Name"
          className="w-full px-4 py-3 rounded bg-white/5 placeholder-gray-500 hover:bg-secondary/5 focus:outline-none"
        />
        <input
          type="text"
          name="from_lastname"
          required
          placeholder="Last Name"
          className="w-full px-4 py-3 rounded bg-white/5 placeholder-gray-500 hover:bg-secondary/5 focus:outline-none"
        />
        <input
          type="email"
          name="from_email"
          required
          placeholder="email@example.com"
          className="w-full px-4 py-3 rounded bg-white/5 placeholder-gray-500 hover:bg-secondary/5 focus:outline-none"
        />
        <input
          type="text"
          name="from_subject"
          required
          placeholder="Message Subject"
          className="w-full px-4 py-3 rounded bg-white/5 placeholder-gray-500 hover:bg-secondary/5 focus:outline-none"
        />
        <textarea
          name="message"
          required
          placeholder="Your Message"
          rows={8}
          className="w-full px-4 py-3 rounded bg-white/5 placeholder-gray-500 hover:bg-secondary/5 resize-none focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-white/5 text-white rounded hover:bg-secondary/30 transition"
        >
          {isSubmitting ? "Sending..." : "SEND MESSAGE"}
        </button>
      </form>
    </Modal>
  );
};

export default EmailModal;
