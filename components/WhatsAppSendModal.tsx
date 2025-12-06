import React, { useState, useEffect } from 'react';
import { Modal, Button } from './UI';
import { Send, Edit, Check, ArrowLeft, MessageSquare } from 'lucide-react';
import { ReceiptTemplate } from '../types';

interface WhatsAppSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  customerPhone: string;
  customerName: string;
  onConfirmSent: () => void;
  onTemplateChange?: (templateId: string) => void;
  availableTemplates?: ReceiptTemplate[];
  currentTemplateId?: string;
}

export const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  isOpen,
  onClose,
  message,
  customerPhone,
  customerName,
  onConfirmSent,
  onTemplateChange,
  availableTemplates,
  currentTemplateId
}) => {
  const [editableMessage, setEditableMessage] = useState(message);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  // Extract dynamic placeholders from message
  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{[^}]+\}/g;
    return text.match(regex) || [];
  };

  const originalPlaceholders = extractPlaceholders(message);
  const currentPlaceholders = extractPlaceholders(editableMessage);

  // Reset state when modal opens or message changes
  useEffect(() => {
    if (isOpen) {
      setEditableMessage(message);
      setWaitingForConfirmation(false);
      setShowTemplateSelector(false);
    }
  }, [isOpen, message]);

  // Step 3: Open WhatsApp with message
  const handleSendToWhatsApp = () => {
    // Check if any dynamic placeholders were removed
    const missingPlaceholders = originalPlaceholders.filter(
      p => !currentPlaceholders.includes(p)
    );

    if (missingPlaceholders.length > 0) {
      const confirmed = window.confirm(
        `⚠️ WARNING: You removed ${missingPlaceholders.length} dynamic field(s):\n\n` +
        missingPlaceholders.join(', ') +
        '\n\nThis may result in incorrect information being sent to the customer.\n\n' +
        'Are you sure you want to continue?'
      );

      if (!confirmed) {
        return; // Cancel sending
      }
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = customerPhone.replace(/\D/g, '');

    // Create WhatsApp Web/App link
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(editableMessage)}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');

    // Step 2: Halt app, show confirmation waiting modal
    setWaitingForConfirmation(true);
  };

  // Step 4: User confirms message was sent
  const handleConfirmSent = () => {
    onConfirmSent();
    onClose();
  };

  // Template change handler
  const handleTemplateChange = (templateId: string) => {
    if (onTemplateChange) {
      onTemplateChange(templateId);
    }
    setShowTemplateSelector(false);
  };

  // Override template handler - saves edited message as custom template
  const handleOverrideTemplate = () => {
    // Check if placeholders are intact
    const missingPlaceholders = originalPlaceholders.filter(
      p => !currentPlaceholders.includes(p)
    );

    if (missingPlaceholders.length > 0) {
      alert(
        '⚠️ Cannot save template:\n\n' +
        `You removed ${missingPlaceholders.length} dynamic field(s):\n` +
        missingPlaceholders.join(', ') +
        '\n\nPlease restore all dynamic fields before saving.'
      );
      return;
    }

    const confirmed = window.confirm(
      '💾 Save this edited message as your new default template?\n\n' +
      'This will override the current template for future messages.'
    );

    if (confirmed) {
      // Save to localStorage
      const templateKey = `custom_template_${currentTemplateId || 'default'}`;
      localStorage.setItem(templateKey, editableMessage);
      alert('✅ Template saved! This will be used as your default for future messages.');
    }
  };

  // Load custom template if exists
  useEffect(() => {
    if (isOpen && currentTemplateId) {
      const templateKey = `custom_template_${currentTemplateId}`;
      const customTemplate = localStorage.getItem(templateKey);
      if (customTemplate && customTemplate !== message) {
        // Don't auto-load if it's the same as the current message
        // This prevents overwriting messages from different sources
      }
    }
  }, [isOpen, currentTemplateId, message]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={waitingForConfirmation ? () => {} : onClose}
      title={waitingForConfirmation ? 'Waiting for Confirmation' : `Send Message to ${customerName}`}
    >
      {!waitingForConfirmation ? (
        // Step 1: Message Preview & Edit
        <div className="space-y-4">
          {/* Template Selector or Overwrite Message */}
          {availableTemplates && onTemplateChange ? (
            <div>
              {showTemplateSelector ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">Choose Template</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTemplateSelector(false)}
                    >
                      <ArrowLeft size={14} /> Back
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {availableTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateChange(template.id)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          template.id === currentTemplateId
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-slate-200 bg-white hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">
                            {template.name}
                          </span>
                          {template.id === currentTemplateId && (
                            <Check size={16} className="text-sky-600" />
                          )}
                        </div>
                        {template.isDefault && (
                          <span className="text-xs text-sky-600 font-medium">Default</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-sm text-slate-900">Message Preview</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTemplateSelector(true)}
                    >
                      <Edit size={14} /> Change Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-400 cursor-not-allowed opacity-60"
                      disabled
                      title="Coming Soon: Save custom templates"
                    >
                      <Edit size={14} /> Save as Default (Coming Soon)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-slate-900">Message</h3>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-400 cursor-not-allowed opacity-60"
                disabled
                title="Coming Soon: Save custom templates"
              >
                <Edit size={14} /> Save as Default (Coming Soon)
              </Button>
            </div>
          )}

          {/* Editable Message */}
          {!showTemplateSelector && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Edit Message (optional)
                </label>
                <textarea
                  value={editableMessage}
                  onChange={(e) => setEditableMessage(e.target.value)}
                  className="w-full h-64 p-3 border border-slate-300 rounded-lg text-sm font-sans leading-relaxed resize-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your message will appear here..."
                />
                {originalPlaceholders.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-700 mb-1">
                      ⚠️ Do not remove dynamic fields:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {originalPlaceholders.map((placeholder, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                            currentPlaceholders.includes(placeholder)
                              ? 'bg-red-100 text-red-700'
                              : 'bg-red-200 text-red-900 line-through'
                          }`}
                        >
                          {placeholder}
                        </span>
                      ))}
                    </div>
                    {originalPlaceholders.some(p => !currentPlaceholders.includes(p)) && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ❌ Warning: Some dynamic fields have been removed!
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Preview how it will look in WhatsApp. Edit if needed.
                </p>
              </div>

              {/* Send Button */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={onClose} fullWidth>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendToWhatsApp}
                  fullWidth
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageSquare size={16} className="mr-1" /> Send via WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        // Step 4: Confirmation Modal (App is halted)
        <div className="space-y-4 py-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare size={32} className="text-green-600" />
          </div>

          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">
              WhatsApp Opened
            </h3>
            <p className="text-sm text-slate-600">
              Please send the message to <span className="font-bold">{customerName}</span> in WhatsApp.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Come back here after sending the message.
            </p>
          </div>

          {/* Confirmation Question */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <p className="font-bold text-amber-900 text-sm mb-3">
              Did you send the message?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                fullWidth
                className="border-slate-300"
              >
                Cancel / Go Back
              </Button>
              <Button
                onClick={handleConfirmSent}
                fullWidth
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check size={16} className="mr-1" /> Yes, Message Sent
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
