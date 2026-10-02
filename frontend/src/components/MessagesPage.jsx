import ConversationsPanel from './ConversationsPanel';

function MessagesPage() {
  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 max-w-[1400px] mx-auto w-full min-h-0 overflow-hidden">
      <ConversationsPanel fullHeight />
    </main>
  );
}

export default MessagesPage;
