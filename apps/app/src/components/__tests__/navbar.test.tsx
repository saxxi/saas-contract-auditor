import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock useTheme
const mockSetTheme = vi.fn();
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

import { Navbar } from "../navbar";

afterEach(() => cleanup());

describe("Navbar", () => {
  it("renders Contract Auditor brand link", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    const brand = screen.getByText("Contract Auditor");
    expect(brand).toBeDefined();
    expect(brand.closest("a")!.getAttribute("href")).toBe("/");
  });

  it("renders Home and Demo navigation links", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Demo")).toBeDefined();
  });

  it("active link has blue color class when on home page", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);

    const homeLink = screen.getByText("Home");
    expect(homeLink.className).toContain("text-blue-600");

    const demoLink = screen.getByText("Demo");
    expect(demoLink.className).not.toContain("text-blue-600");
  });

  it("active link has blue color class when on demo page", () => {
    mockUsePathname.mockReturnValue("/demo");
    render(<Navbar />);

    const demoLink = screen.getByText("Demo");
    expect(demoLink.className).toContain("text-blue-600");

    const homeLink = screen.getByText("Home");
    expect(homeLink.className).not.toContain("text-blue-600");
  });

  it("theme toggle button is present", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Navbar />);
    const toggleBtn = screen.getByLabelText("Toggle theme");
    expect(toggleBtn).toBeDefined();
  });
});
