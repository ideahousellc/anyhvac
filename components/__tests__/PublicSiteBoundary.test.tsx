import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/admin",
  footer: vi.fn(() => null),
  modalProvider: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));
vi.mock("@/components/Footer", () => ({ Footer: mocks.footer }));
vi.mock("@/components/ModalProvider", () => ({
  ModalProvider: mocks.modalProvider,
}));

import {
  isAdminPath,
  PublicSiteBoundary,
} from "@/components/PublicSiteBoundary";

beforeEach(() => {
  mocks.footer.mockClear();
  mocks.modalProvider.mockClear();
});

describe("PublicSiteBoundary", () => {
  it.each(["/admin", "/admin/mail", "/admin/another/nested-route"])(
    "does not initialize public chrome on %s",
    (pathname) => {
      mocks.pathname = pathname;
      expect(renderToStaticMarkup(
        <PublicSiteBoundary><p>Admin content</p></PublicSiteBoundary>,
      )).toContain("Admin content");
      expect(mocks.modalProvider).not.toHaveBeenCalled();
      expect(mocks.footer).not.toHaveBeenCalled();
    },
  );

  it("preserves the existing public provider and footer", () => {
    mocks.pathname = "/tools";
    renderToStaticMarkup(
      <PublicSiteBoundary><p>Public content</p></PublicSiteBoundary>,
    );
    expect(mocks.modalProvider).toHaveBeenCalledOnce();
    expect(mocks.footer).toHaveBeenCalledOnce();
  });

  it("does not exclude similarly named public paths", () => {
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/admin-tools")).toBe(false);
  });
});
