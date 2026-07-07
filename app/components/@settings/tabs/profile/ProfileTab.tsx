import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { toast } from 'react-toastify';
import { debounce } from '~/utils/debounce';
import { Switch } from '~/components/ui/Switch';
import NotificationsTab from '~/components/@settings/tabs/notifications/NotificationsTab';
import FeaturesTab from '~/components/@settings/tabs/features/FeaturesTab';

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={classNames(icon, 'w-4 h-4 text-accent')} />
      <span className="font-display text-sm font-semibold text-bolt-elements-textPrimary">{title}</span>
    </div>
  );
}

function ProfileFieldsSection() {
  const profile = useStore(profileStore);
  const [isUploading, setIsUploading] = useState(false);

  const debouncedUpdate = useCallback(
    debounce((field: 'username' | 'bio', value: string) => {
      updateProfile({ [field]: value });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    }, 1000),
    [],
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);

      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ avatar: base64String });
        setIsUploading(false);
        toast.success('Profile picture updated');
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setIsUploading(false);
        toast.error('Failed to update profile picture');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setIsUploading(false);
      toast.error('Failed to update profile picture');
    }
  };

  const handleProfileUpdate = (field: 'username' | 'bio', value: string) => {
    updateProfile({ [field]: value });
    debouncedUpdate(field, value);
  };

  return (
    <div>
      <SectionHeading icon="i-ph:user-fill" title="Profile" />

      <div className="flex items-start gap-6 mb-6">
        <div
          className={classNames(
            'w-20 h-20 shrink-0 overflow-hidden',
            'border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2',
            'flex items-center justify-center relative group',
          )}
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="i-ph:robot-fill w-10 h-10 text-bolt-elements-textTertiary" />
          )}

          <label
            className={classNames(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/0 group-hover:bg-black/50',
              'cursor-pointer transition-colors',
              isUploading ? 'cursor-wait' : '',
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="i-ph:spinner-gap w-5 h-5 text-white animate-spin" />
            ) : (
              <div className="i-ph:camera-plus w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </label>
        </div>

        <div className="flex-1 pt-1">
          <div className="text-sm font-medium text-bolt-elements-textPrimary mb-1">Profile picture</div>
          <p className="text-xs text-bolt-elements-textTertiary">Upload a picture or avatar</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-bolt-elements-textSecondary mb-1.5">Username</label>
        <input
          type="text"
          value={profile.username}
          onChange={(e) => handleProfileUpdate('username', e.target.value)}
          className={classNames(
            'w-full px-3 py-2 text-sm',
            'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
            'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
            'focus:outline-none focus:border-accent transition-theme',
          )}
          placeholder="Enter your username"
        />
      </div>

      <div>
        <label className="block text-xs text-bolt-elements-textSecondary mb-1.5">Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => handleProfileUpdate('bio', e.target.value)}
          className={classNames(
            'w-full px-3 py-2 text-sm resize-none h-24',
            'bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor',
            'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
            'focus:outline-none focus:border-accent transition-theme',
          )}
          placeholder="Tell us about yourself"
        />
      </div>
    </div>
  );
}

const NOTIFICATIONS_ENABLED_KEY = 'bolt_notifications_enabled';

function getInitialNotificationsEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);

  return stored === null ? true : stored === 'true';
}

function NotificationsSection() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(getInitialNotificationsEnabled);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading icon="i-ph:bell-fill" title="Notifications" />
        <div className="flex items-center gap-2 -mt-4">
          <span className="text-xs text-bolt-elements-textSecondary">
            {notificationsEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={(checked) => {
              setNotificationsEnabled(checked);
              localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(checked));
              toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
            }}
          />
        </div>
      </div>

      <NotificationsTab />
    </div>
  );
}

function AdvancedSection() {
  return (
    <div>
      <SectionHeading icon="i-ph:sliders-horizontal-fill" title="Advanced" />
      <FeaturesTab />
    </div>
  );
}

export default function ProfileTab() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <ProfileFieldsSection />
      <div className="border-t border-bolt-elements-borderColor" />
      <NotificationsSection />
      <div className="border-t border-bolt-elements-borderColor" />
      <AdvancedSection />
    </div>
  );
}
