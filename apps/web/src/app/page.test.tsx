import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("identifica la experiencia de pedidos a domicilio", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Pedidos a domicilio",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("BBQBROS")).toBeInTheDocument();
  });
});
