import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CommandLog } from '../types';

export function useCommandStatus(panelSerial: string, commandId: string | null) {
  const [commandLog, setCommandLog] = useState<CommandLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!commandId || !panelSerial) {
      setCommandLog(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, 'panels', panelSerial, 'commands', commandId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCommandLog({
            id: snapshot.id,
            command: data.command,
            status: data.status,
            ackStatus: data.ackStatus
          });

          if (data.status === 'sent' && data.ackStatus === 'acknowledged') {
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error('Error watching command:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [panelSerial, commandId]);

  return { commandLog, loading };
}
