// src/components/layout/Sidebar.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: "DASHBOARD", href: "/admin", icon: "🏠" },
    { name: "USERS", href: "/admin/users" },
    { name: "CONSUMER", href: "/admin/consumer" },
    { name: "BRANDS", href: "/admin/brands", icon: "🏢" },
    { name: "CONTENT CALENDAR", href: "/admin/content-calendar", icon: "📅" },
    { name: "ANALYSIS", href: "/admin/analysis", icon: "📊" },
    { name: "SOCIAL ACCOUNTS", href: "/admin/social-accounts", icon: "📱" },
    { name: "SEARCH QUERIES", href: "/admin/search-queries", icon: "🔍" },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gray-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }
        flex flex-col
      `}
      >
        {/* Admin Panel Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-wider">DNAI ADMIN</h1>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  pathname === item.href
                    ? "bg-green-700 text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              {/* <span className="text-xl">{item.icon}</span> */}
              <span className="font-medium tracking-wide text-sm">
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
          © 2025 DNAI System
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
