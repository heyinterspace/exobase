import React, { useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { useEnvKeyStatus } from './APIKeyManager';
import { ApiKeyDialog } from './ApiKeyDialog';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import FilePreview from './FilePreview';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { SupabaseConnection } from './SupabaseConnection';
import { ExpoQrModal } from '~/components/workbench/ExpoQrModal';
import { ExamplePrompts } from './ExamplePrompts';
import GitCloneButton from './GitCloneButton';
import styles from './BaseChat.module.scss';
import type { ProviderInfo } from '~/types/model';
import type { ElementInfo } from '~/components/workbench/Inspector';

interface ChatBoxProps {
  provider: any;
  providerList: any[];
  modelList: any[];
  apiKeys: Record<string, string>;
  isModelLoading: string | undefined;
  onApiKeysChange: (providerName: string, apiKey: string) => void;
  uploadedFiles: File[];
  imageDataList: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined;
  input: string;
  handlePaste: (e: React.ClipboardEvent) => void;
  TEXTAREA_MIN_HEIGHT: number;
  TEXTAREA_MAX_HEIGHT: number;
  isStreaming: boolean;
  handleSendMessage: (event: React.UIEvent, messageInput?: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  chatStarted: boolean;
  exportChat?: () => void;
  qrModalOpen: boolean;
  setQrModalOpen: (open: boolean) => void;
  handleFileUpload: () => void;
  setProvider?: ((provider: ProviderInfo) => void) | undefined;
  model?: string | undefined;
  setModel?: ((model: string) => void) | undefined;
  setUploadedFiles?: ((files: File[]) => void) | undefined;
  setImageDataList?: ((dataList: string[]) => void) | undefined;
  handleInputChange?: ((event: React.ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  handleStop?: (() => void) | undefined;
  chatMode?: 'discuss' | 'build';
  selectedElement?: ElementInfo | null;
  setSelectedElement?: ((element: ElementInfo | null) => void) | undefined;
  importChat?: (description: string, messages: any[]) => Promise<void>;
}

export const ChatBox: React.FC<ChatBoxProps> = (props) => {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const isEnvKeySet = useEnvKeyStatus(props.provider?.name || '');

  const isLocalProvider = props.provider ? LOCAL_PROVIDERS.includes(props.provider.name) : false;
  const currentApiKey = props.provider ? props.apiKeys[props.provider.name] || '' : '';
  const needsApiKey = Boolean(props.provider) && !isLocalProvider && !currentApiKey && !isEnvKeySet;

  const guardedSend = (event: React.UIEvent, messageInput?: string) => {
    if (needsApiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    props.handleSendMessage?.(event, messageInput);
  };

  const canSubmit = (props.input.length > 0 || props.uploadedFiles.length > 0) && !props.isStreaming;

  return (
    <div
      className={classNames(
        'relative glass p-3 border border-bolt-elements-borderColor shadow-hard-lg relative w-full max-w-chat mx-auto z-prompt',
      )}
    >
      <svg className={classNames(styles.PromptEffectContainer)}>
        <defs>
          <linearGradient
            id="line-gradient"
            x1="20%"
            y1="0%"
            x2="-14%"
            y2="10%"
            gradientUnits="userSpaceOnUse"
            gradientTransform="rotate(-45)"
          >
            <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
            <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
            <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
            <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
          </linearGradient>
          <linearGradient id="shine-gradient">
            <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
            <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
            <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
            <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
          </linearGradient>
        </defs>
        <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
        <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
      </svg>
      <FilePreview
        files={props.uploadedFiles}
        imageDataList={props.imageDataList}
        onRemove={(index) => {
          props.setUploadedFiles?.(props.uploadedFiles.filter((_, i) => i !== index));
          props.setImageDataList?.(props.imageDataList.filter((_, i) => i !== index));
        }}
      />
      <ClientOnly>
        {() => (
          <ScreenshotStateManager
            setUploadedFiles={props.setUploadedFiles}
            setImageDataList={props.setImageDataList}
            uploadedFiles={props.uploadedFiles}
            imageDataList={props.imageDataList}
          />
        )}
      </ClientOnly>
      {props.selectedElement && (
        <div className="flex mx-1.5 gap-2 items-center justify-between border-b-0 border border-bolt-elements-borderColor text-bolt-elements-textPrimary flex py-1 px-2.5 font-medium text-xs">
          <div className="flex gap-2 items-center lowercase">
            <code className="bg-accent text-accent-ink px-1.5 py-1 mr-0.5">{props?.selectedElement?.tagName}</code>
            selected for inspection
          </div>
          <button className="bg-transparent text-accent pointer-auto" onClick={() => props.setSelectedElement?.(null)}>
            Clear
          </button>
        </div>
      )}
      <div
        className={classNames(
          'relative border border-bolt-elements-borderColor shadow-hard bg-bolt-elements-background-depth-2',
        )}
      >
        <textarea
          ref={props.textareaRef}
          className={classNames(
            'w-full pl-4 pt-4 pr-4 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
            'transition-all duration-200',
            'hover:border-bolt-elements-focus',
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '2px solid #1488fc';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

            const files = Array.from(e.dataTransfer.files);
            files.forEach((file) => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = (e) => {
                  const base64Image = e.target?.result as string;
                  props.setUploadedFiles?.([...props.uploadedFiles, file]);
                  props.setImageDataList?.([...props.imageDataList, base64Image]);
                };
                reader.readAsDataURL(file);
              }
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              if (event.shiftKey) {
                return;
              }

              event.preventDefault();

              if (props.isStreaming) {
                props.handleStop?.();
                return;
              }

              // ignore if using input method engine
              if (event.nativeEvent.isComposing) {
                return;
              }

              guardedSend(event);
            }
          }}
          value={props.input}
          onChange={(event) => {
            props.handleInputChange?.(event);
          }}
          onPaste={props.handlePaste}
          style={{
            minHeight: props.TEXTAREA_MIN_HEIGHT,
            maxHeight: props.TEXTAREA_MAX_HEIGHT,
          }}
          placeholder={
            props.chatMode === 'build'
              ? 'Describe the app you want to build to get started'
              : 'What would you like to discuss?'
          }
          translate="no"
        />

        {!props.chatStarted && props.input.length === 0 && (
          <div className="px-4 pb-2">
            {ExamplePrompts((event, messageInput) => {
              if (props.isStreaming) {
                props.handleStop?.();
                return;
              }

              guardedSend(event, messageInput);
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-sm pt-2 gap-2">
        <div className="flex gap-1 items-center flex-wrap">
          <ClientOnly>
            {() => (
              <ModelSelector
                key={props.provider?.name + ':' + props.modelList.length}
                model={props.model}
                setModel={props.setModel}
                modelList={props.modelList}
                provider={props.provider}
                setProvider={props.setProvider}
                providerList={props.providerList || (PROVIDER_LIST as ProviderInfo[])}
                apiKeys={props.apiKeys}
                modelLoading={props.isModelLoading}
              />
            )}
          </ClientOnly>
          <button
            type="button"
            title="Attach a file"
            onClick={() => props.handleFileUpload()}
            className={classNames(
              'flex items-center gap-1 px-2 py-1.5 shrink-0',
              'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
              'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary',
              'hover:border-accent hover:text-accent',
              'text-xs font-medium transition-theme',
            )}
          >
            <div className="i-ph:paperclip text-sm" />
            Attach
          </button>
          <GitCloneButton iconOnly importChat={props.importChat} />
          <SpeechRecognitionButton
            isListening={props.isListening}
            onStart={props.startListening}
            onStop={props.stopListening}
            disabled={props.isStreaming}
          />
          {/* Mounted headlessly so the in-chat "Connect to Supabase" alert can still open this dialog */}
          <SupabaseConnection hideTrigger />
        </div>

        <button
          type="button"
          onClick={(event) => {
            if (props.isStreaming) {
              props.handleStop?.();
              return;
            }

            if (canSubmit) {
              guardedSend(event);
            }
          }}
          disabled={!canSubmit && !props.isStreaming}
          className={classNames(
            'flex items-center gap-1.5 px-3 py-1.5 shrink-0',
            'border border-bolt-elements-borderColor shadow-hard-sm press-hard-sm',
            'bg-accent text-accent-ink hover:brightness-110',
            'text-xs font-semibold transition-[filter]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-hard-sm',
          )}
        >
          {props.isStreaming ? (
            <>
              <div className="i-ph:stop-circle-bold w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <div className="i-ph:rocket-launch-fill w-4 h-4" />
              Launch
            </>
          )}
        </button>
      </div>

      <ExpoQrModal open={props.qrModalOpen} onClose={() => props.setQrModalOpen(false)} />

      {props.provider && (
        <ApiKeyDialog
          open={showApiKeyDialog}
          onClose={() => setShowApiKeyDialog(false)}
          provider={props.provider}
          apiKey={currentApiKey}
          setApiKey={(key) => props.onApiKeysChange(props.provider.name, key)}
        />
      )}
    </div>
  );
};
