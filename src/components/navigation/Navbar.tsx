
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="text-lg font-medium tracking-tight hover:opacity-80 transition-opacity"
          >
            docupad
          </Link>
          <div className="flex space-x-8">
            <Link
              to="/docs"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Documentation
            </Link>
            <Link
              to="/search"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Search
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
