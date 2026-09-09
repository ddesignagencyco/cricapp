interface FormMessageProps {
  message?: string;
  tone?: 'error' | 'success' | 'info';
}

export default function FormMessage({ message, tone = 'error' }: FormMessageProps) {
  if (!message) return null;
  const color = tone === 'success' ? 'text-accent2' : tone === 'info' ? 'text-stext' : 'text-danger';
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`text-sm ${color}`}>{message}</p>;
}
