import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("identifica la experiencia de pedidos a domicilio", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Pedidos a domicilio",
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("font-editorial");
    expect(screen.getByText("BBQBROS")).toBeInTheDocument();
  });
});
