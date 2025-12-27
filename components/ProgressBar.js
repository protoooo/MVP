export default function ProgressBar({ progress }) {
  return (
    <div className="w-full h-4 bg-gray-200 rounded-full mb-4">
      <div
        className="h-4 bg-indigo-600 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
