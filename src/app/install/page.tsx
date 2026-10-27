export default function Install() {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "rishi-iso";
  
  return (
    <div className="p-8 max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Install GitHub App</h1>
      <p className="text-gray-600 mb-6">
        Install the Iso GitHub App on your repositories to enable CI failure investigation.
      </p>
      <a
        href={`https://github.com/apps/${appName}/installations/new`}
        className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800"
      >
        Install GitHub App
      </a>
      <p className="text-sm text-gray-500 mt-4">
        You'll be able to select specific repositories or all repositories during installation.
      </p>
    </div>
  );
}
