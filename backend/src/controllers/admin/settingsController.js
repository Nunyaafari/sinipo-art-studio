import { getStorefrontSettingsState, savePersistentState } from '../../storage/persistentState.js';
import {
  createDefaultStorefrontSettings,
  sanitizeStorefrontSettings
} from '../../config/storefrontSettings.js';
import { recordAdminAudit } from '../../utils/adminAudit.js';

const syncSettingsState = (nextSettings) => {
  const settingsState = getStorefrontSettingsState();

  Object.keys(settingsState).forEach((key) => {
    delete settingsState[key];
  });

  Object.assign(settingsState, nextSettings);

  return settingsState;
};

const getSafeStorefrontSettings = () => {
  try {
    return sanitizeStorefrontSettings(getStorefrontSettingsState());
  } catch (error) {
    console.error('Storefront settings recovery triggered:', error);

    const fallbackSettings = sanitizeStorefrontSettings(createDefaultStorefrontSettings());
    syncSettingsState(fallbackSettings);
    savePersistentState();

    return fallbackSettings;
  }
};

export const getStorefrontSettingsAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      data: getSafeStorefrontSettings()
    });
  } catch (error) {
    console.error('Get storefront settings error:', error);
    const fallbackSettings = sanitizeStorefrontSettings(createDefaultStorefrontSettings());

    try {
      syncSettingsState(fallbackSettings);
      savePersistentState();
    } catch (recoveryError) {
      console.error('Storefront settings final recovery failed:', recoveryError);
    }

    res.json({
      success: true,
      data: fallbackSettings,
      warning: 'Storefront settings were reset to defaults after a recovery error.'
    });
  }
};

export const updateStorefrontSettingsAdmin = async (req, res) => {
  try {
    const previousSettings = getSafeStorefrontSettings();
    const nextSettings = sanitizeStorefrontSettings(req.body);
    const settingsState = syncSettingsState(nextSettings);
    savePersistentState();
    recordAdminAudit(req, {
      action: 'settings.update',
      targetType: 'storefrontSettings',
      targetId: 'storefront',
      summary: 'Updated storefront settings',
      changes: {
        before: previousSettings,
        after: settingsState
      }
    });

    res.json({
      success: true,
      data: settingsState,
      message: 'Storefront settings updated successfully'
    });
  } catch (error) {
    console.error('Update storefront settings error:', error);
    res.status(500).json({
      error: 'Failed to update storefront settings',
      message: error.message
    });
  }
};
