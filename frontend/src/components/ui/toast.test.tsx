import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success("User created", "desk2 can now sign in")}>
      go
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => vi.useRealTimers());

  it("shows a toast and dismisses it automatically", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByRole("status")).toHaveTextContent("User createddesk2 can now sign in");
    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("can be closed with the close button", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("go"));
    fireEvent.click(screen.getByLabelText("বন্ধ করুন"));
    expect(screen.queryByText("User created")).not.toBeInTheDocument();
  });
});
