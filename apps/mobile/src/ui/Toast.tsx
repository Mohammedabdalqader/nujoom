import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type ToastContextValue = { show: (message: string) => void };

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/** The prototype's floating emerald toast (top, 3.2 s). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message ? (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-4 items-center"
          style={{ top: insets.top + 80 }}
        >
          <View
            accessibilityLiveRegion="polite"
            className="w-full max-w-sm p-3 rounded-xl bg-secondary-container border border-secondary shadow-2xl flex-row items-center justify-between gap-2"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Icon name="check_circle" size={20} className="text-on-secondary-container" />
              <Text className="text-[13px] text-on-secondary-container font-bold flex-1">
                {message}
              </Text>
            </View>
            <Pressable onPress={() => setMessage(null)} hitSlop={8}>
              <Icon name="close" size={16} className="text-on-secondary-container" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
