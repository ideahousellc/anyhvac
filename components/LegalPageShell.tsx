import { ContentPage, StatusPanel } from "@/components/ContentPage";

export function LegalPageShell({
  title,
  documentName,
}: {
  title: string;
  documentName: string;
}) {
  return (
    <ContentPage
      compact
      eyebrow="Legal"
      title={title}
      intro={`The final ${documentName} is being prepared as part of AnyHVAC's public-launch development.`}
    >
      <StatusPanel>
        <p>
          This page is a route and presentation shell only. It does not contain
          the final {documentName} and should not be treated as a published legal
          document.
        </p>
        <p>Final content will be added after dedicated legal review and research.</p>
      </StatusPanel>
    </ContentPage>
  );
}
