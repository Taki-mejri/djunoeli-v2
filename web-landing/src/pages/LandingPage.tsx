import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Services from "../components/landing/Services";
import HowItWorks from "../components/landing/HowItWorks";
import About from "../components/landing/About";
import Contact from "../components/landing/Contact";
import Footer from "../components/landing/Footer";
import LoginModal from "../components/landing/LoginModal";

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const openLogin = () => setLoginOpen(true);
  const { hash } = useLocation();

  // Arrivée depuis une autre page via /#section : le navigateur tente le défilement
  // avant le rendu React des sections, on le refait une fois la page montée.
  useEffect(() => {
    if (!hash) return;
    const id = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(id);
  }, [hash]);

  return (
    <>
      <Navbar onLogin={openLogin} showLanguageSelector />
      <Hero onLogin={openLogin} />
      <Services />
      <HowItWorks />
      <About />
      <Contact />
      <Footer onLogin={openLogin} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
