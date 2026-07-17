import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography, Stack, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import PolicyPickerDialog from "../../components/policy/PolicyPickerDialog";
import PolicyConfigDialog from "../../components/policy/PolicyConfigDialog";
import { sharedFlowsApi } from "../../api/services";
import { PolicyTypeDef } from "../../data/policyCatalog";
import { useUiStore } from "../../store/uiStore";

export default function SharedFlowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const [flow, setFlow] = useState<any>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configDef, setConfigDef] = useState<PolicyTypeDef | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setFlow(await sharedFlowsApi.get(id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!flow) return <Typography color="text.secondary">Loading...</Typography>;
  const revision = flow.revisions[0];

  async function handleAdd(name: string, type: string, config: Record<string, any>, xml?: string) {
    await sharedFlowsApi.addPolicy(flow.id, revision.revision, { name, type, config, xml, order: (revision.policies?.length || 0) + 1 });
    showSnackbar("Policy added to shared flow");
    load();
  }

  async function handleRemove(policyId: string) {
    await sharedFlowsApi.removePolicy(policyId);
    showSnackbar("Policy removed");
    load();
  }

  return (
    <Box>
      <PageHeader title={flow.name} breadcrumbs={["Shared Flows"]} subtitle={`Revision ${revision.revision} · ${flow.description}`} actions={<Button variant="outlined" onClick={() => navigate("/shared-flows")}>Back to list</Button>} />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Steps (executed in order)
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
            Add Policy Step
          </Button>
        </Box>
        <Stack spacing={1}>
          {(revision.policies || []).map((p: any, idx: number) => (
            <Paper key={p.id} variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, cursor: "pointer" }} onClick={() => setEditingPolicy(p)}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 26, height: 26, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{idx + 1}</Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.type}
                  </Typography>
                </Box>
              </Box>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRemove(p.id); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
          {(revision.policies || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No steps yet - add a policy to get started.
            </Typography>
          )}
        </Stack>
      </Paper>

      <PolicyPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(def) => { setPickerOpen(false); setConfigDef(def); }} />
      {configDef && <PolicyConfigDialog open={Boolean(configDef)} onClose={() => setConfigDef(null)} policyType={configDef.type} onSave={(name, config, xml) => handleAdd(name, configDef.type, config, xml)} />}
      {editingPolicy && (
        <PolicyConfigDialog
          open={Boolean(editingPolicy)}
          onClose={() => setEditingPolicy(null)}
          policyType={editingPolicy.type}
          initialName={editingPolicy.name}
          initialConfig={editingPolicy.config}
          initialXml={editingPolicy.xml}
          onSave={async (name, config, xml) => {
            await handleRemove(editingPolicy.id);
            await handleAdd(name, editingPolicy.type, config, xml);
          }}
        />
      )}
    </Box>
  );
}
