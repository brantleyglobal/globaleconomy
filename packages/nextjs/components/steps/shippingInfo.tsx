"use client";

import React, { useState, useEffect } from "react";
import { useCheckoutStore } from "~~/components/purchase/useCheckoutStore";
import { supportedCountries } from "~~/components/shipping/supportedCountries";

export const ShippingInfoStep: React.FC<{ currentStep: number; setCurrentStep: (step: number) => void }> = ({ currentStep, setCurrentStep }) => {
  const { setField, shippingInfo } = useCheckoutStore();

  // Use individual states for each field
  const [userFirstName, setUserFirstName] = useState(shippingInfo?.firstname || "");
  const [userLastName, setUserLastName] = useState(shippingInfo?.lastname || "");
  const [userAddress, setUserAddress] = useState(shippingInfo?.address || "");
  const [userPhone, setUserPhone] = useState(shippingInfo?.phone || "");
  const [userEmail, setUserEmail] = useState(shippingInfo?.email || "");
  const [userCity, setUserCity] = useState(shippingInfo?.city || "");
  const [userState, setUserState] = useState(shippingInfo?.state || "");
  const [userZip, setUserZip] = useState(shippingInfo?.postalCode || "");
  const [userCountry, setUserCountry] = useState(shippingInfo?.country || "");
  const [emailError, setEmailError] = useState("");
    
    // Basic email validation regex
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // Handle input change with validation
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const email = e.target.value;
      setUserEmail(email);

      if (email === "" || validateEmail(email)) {
        setEmailError(""); // Clear error if empty or valid
      } else {
        setEmailError("Please enter a valid email address");
      }
    };

  // Sync formData to checkout store
  useEffect(() => {
    setField("shippingInfo", {
      firstname: userFirstName,
      lastname: userLastName,
      address: userAddress,
      phone: userPhone,
      email: userEmail,
      city: userCity,
      state: userState,
      postalCode: userZip,
      country: userCountry,
      // Add region separately if needed
    });
  }, [userFirstName, userLastName, userAddress, userPhone, userEmail, userCity, userState, userZip, userCountry]);

  // Disable "Next" if any required field is empty
  const isDisabled =
    !userFirstName.trim() ||
    !userLastName.trim() ||
    !userEmail.trim() ||
    !userAddress.trim() ||
    !userCity.trim() ||
    !userState.trim() ||
    !userZip.trim() ||
    !userCountry.trim();

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-light mb-6 text-primary">SHIPPING INFORMATION</h3>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="First Name"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userFirstName}
          onChange={(e) => setUserFirstName(e.target.value)}
        />
        <input 
          type="text"
          placeholder="Last Name"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userLastName}
          onChange={(e) => setUserLastName(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Phone Number"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userPhone}
          onChange={(e) => setUserPhone(e.target.value)}
        />
        <input
          type="email"
          value={userEmail}
          onChange={handleEmailChange}
          placeholder="Email Address"
          className={`input w-full bg-black mt-2 rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5 ${
          emailError ? "border-red-500" : ""
          }`}
        />
        {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
        )}
        <input
          type="text"
          placeholder="Shipping Address"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
        />
        <input
          type="text"
          placeholder="City / Municipality / Commune"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userCity}
          onChange={(e) => setUserCity(e.target.value)}
        />
        <input
          type="text"
          placeholder="State / Province / Territory"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userState}
          onChange={(e) => setUserState(e.target.value)}
        />
        <input
          type="text"
          placeholder="Postal Code"
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
          value={userZip}
          onChange={(e) => setUserZip(e.target.value)}
        />
        <select
          value={userCountry}
          onChange={(e) => setUserCountry(e.target.value)}
          className="input w-full bg-black rounded-md outline-none focus:outline-none ring-none border-none text-white placeholder:text-white/50 hover:bg-secondary/5"
        >
          <option value="">Select Country</option>
          {supportedCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 border-t bg-transparent w-full mt-6">
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
        >
          Previous
        </button>
        <button
          className="btn btn-primary/15 hover:bg-secondary/30 btn-sm h-8 text-xs text-white rounded-md flex items-center justify-center gap-2 disabled:opacity-50 px-6 w-full sm:w-auto"
          onClick={() => setCurrentStep(currentStep + 1)}
          disabled={isDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
};
