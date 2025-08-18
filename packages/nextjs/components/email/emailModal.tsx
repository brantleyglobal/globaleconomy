"use client";
import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
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

    if (!formRef.current) return;

    try {
      await emailjs.sendForm(
        "service_crhvudw",     // Replace with your EmailJS service ID
        "template_8wfgfbd",    // Replace with your EmailJS template ID
        formRef.current,
        "hmyGTaAo-w8QdiTwI"      // Replace with your EmailJS public key
      );

      alert("Message sent!");
      onClose();
    } catch (error) {
      console.error("EmailJS error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="EMAIL US" isOpen={isOpen} onClose={onClose}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 text-md align-center font-light text-white"
      >
        <input
          type="text"
          name="from_name"
          required
          placeholder="NAME"
          className="w-full px-3 py-2 rounded bg-white/5 placeholder-gray-500"
        />
        <input
          type="email"
          name="from_email"
          required
          placeholder="email@example.com"
          className="w-full px-3 py-2 rounded bg-white/5 placeholder-gray-500"
        />
        <textarea
          name="message"
          required
          placeholder="YOUR MESSAGE"
          rows={10}
          className="w-full px-3 py-2 rounded bg-white/5 placeholder-gray-500 resize-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-primary text-white rounded hover:bg-primary/80 transition"
        >
          {isSubmitting ? "Sending..." : "SEND MESSAGE"}
        </button>
      </form>
    </Modal>
  );
};

export default EmailModal;
