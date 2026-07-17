import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Tabs, Tab, Switch, FormControlLabel, MenuItem, Alert, Typography } from "@mui/material";
import Editor from "@monaco-editor/react";
import { getPolicyDef, PolicyTypeDef } from "../../data/policyCatalog";

export interface PolicyConfigDialogProps {
  open: boolean;
  onClose: () => void;
  policyType: string;
  initialName?: string;
  initialConfig?: Record<string, any>;
  initialXml?: string;
  onSave: (name: string, config: Record<string, any>, xml?: string) => Promise<void> | void;
}

function xmlIsWellFormed(xml: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return doc.getElementsByTagName("parsererror").length === 0;
  } catch {
    return false;
  }
}

export default function PolicyConfigDialog({ open, onClose, policyType, initialName, initialConfig, initialXml, onSave }: PolicyConfigDialogProps) {
  const def: PolicyTypeDef | undefined = useMemo(() => getPolicyDef(policyType), [policyType]);
  const [tab, setTab] = useState(0);
  const [name, setName] = useState(initialName || policyType);
  const [config, setConfig] = useState<Record<string, any>>({ ...(def?.defaultConfig || {}), ...(initialConfig || {}) });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [xmlOverride, setXmlOverride] = useState<string | null>(null);

  useEffect(() => {
    const nextName = initialName || policyType;
    const nextConfig = { ...(def?.defaultConfig || {}), ...(initialConfig || {}) };
    setName(nextName);
    setConfig(nextConfig);
    setErrors([]);
    setTab(0);
    if (def && initialXml && initialXml.trim() !== def.buildXml(nextName, nextConfig).trim()) {
      setXmlOverride(initialXml);
    } else {
      setXmlOverride(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyType, initialName, initialConfig, initialXml, open]);

  if (!def) return null;

  const generatedXml = def.buildXml(name || def.type, config);
  const displayedXml = xmlOverride ?? generatedXml;
  const isCustomXml = xmlOverride !== null;

  function setField(key: string, value: any) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    const validationErrors = def!.validate(config);
    if (!name) validationErrors.unshift('"Policy Name" is required.');
    if (isCustomXml && !xmlIsWellFormed(displayedXml)) {
      validationErrors.push('The XML on the "XML View" tab is not well-formed. Fix it or click "Regenerate from Configuration".');
    }
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave(name, config, isCustomXml ? displayedXml : undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {def.type}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {def.category} policy
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 460 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {def.description}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {def.whenToUse}
          </Typography>
        </Alert>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors([])}>
            {errors.join(" ")}
          </Alert>
        )}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Configuration" />
          <Tab label="XML View" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Policy Name" size="small" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            {def.fields.map((f) => {
              if (f.type === "select") {
                return (
                  <TextField key={f.key} select label={f.label} size="small" fullWidth value={config[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} helperText={f.helpText}>
                    {(f.options || []).map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              if (f.type === "boolean") {
                return <FormControlLabel key={f.key} control={<Switch checked={Boolean(config[f.key])} onChange={(e) => setField(f.key, e.target.checked)} />} label={f.label} />;
              }
              if (f.type === "textarea") {
                return <TextField key={f.key} label={f.label} size="small" fullWidth multiline rows={4} value={config[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} helperText={f.helpText} />;
              }
              if (f.type === "number") {
                return <TextField key={f.key} label={f.label} type="number" size="small" fullWidth value={config[f.key] ?? ""} onChange={(e) => setField(f.key, Number(e.target.value))} helperText={f.helpText} />;
              }
              return <TextField key={f.key} label={f.label} size="small" fullWidth value={config[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} helperText={f.helpText} placeholder={f.placeholder} />;
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {isCustomXml ? (
              <Alert
                severity="warning"
                variant="outlined"
                action={
                  <Button size="small" onClick={() => setXmlOverride(null)}>
                    Regenerate from Configuration
                  </Button>
                }
              >
                <strong>This hand-edited XML is saved for reference/export only - it does NOT change how this policy runs.</strong> Trace
                always executes using the values on the "Configuration" tab, never this XML. If you changed something here expecting
                different behavior in Trace (e.g. where OAuthV2 looks for the access token), make that same change on the Configuration
                tab instead, or click "Regenerate from Configuration" to discard this override.
              </Alert>
            ) : (
              <Alert severity="info" variant="outlined">
                This is a read-only preview of the XML generated from the Configuration tab. You can type in it, but{" "}
                <strong>Trace only ever executes the Configuration tab's values - hand edits here have no effect on runtime behavior.</strong>{" "}
                Use this view to copy/inspect the generated markup, or to compare against real Apigee's schema; use the Configuration tab
                for anything you actually want to take effect when you run a trace.
              </Alert>
            )}
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              <Editor
                height="340px"
                defaultLanguage="xml"
                language="xml"
                value={displayedXml}
                onChange={(v) => setXmlOverride(v ?? "")}
                theme="vs-light"
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
}
