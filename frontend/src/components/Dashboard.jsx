import PlatformStatus from './PlatformStatus';
import MessageSimulator from './MessageSimulator';
import PromptEditor from './PromptEditor';

function Dashboard() {
  return (
    <main className="flex-1 flex flex-col gap-6 p-6 md:p-8 max-w-[1200px] mx-auto w-full overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PlatformStatus />
        <div className="flex flex-col gap-6">
          <MessageSimulator />
          <PromptEditor />
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
