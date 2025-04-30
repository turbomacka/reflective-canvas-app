interface Props {
  text: string;
}

export default function FeedbackBox({ text }: Props) {
  return (
    <section className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded">
      <h2 className="font-semibold mb-2">Automatisk återkoppling</h2>
      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: text }} />
    </section>
  );
}
