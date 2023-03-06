import { hooksAddAdminIcon, hooksAddFakeDoorFeatures } from '@/hooks/utils';
import {
	getAuthenticationModalEventData,
	getExpressionEditorEventsData,
	getInsertedItemFromExpEditorEventData,
	getNodeTypeChangedEventData,
	getOpenWorkflowSettingsEventData,
	getOutputModeChangedEventData,
	getUpdatedWorkflowSettingsEventData,
	getUserSavedCredentialsEventData,
	getExecutionFinishedEventData,
	getNodeRemovedEventData,
	getNodeEditingFinishedEventData,
	getExecutionStartedEventData,
} from '@/hooks/segment';
import { useNDVStore } from '@/stores/ndv';
import { useWorkflowsStore } from '@/stores/workflows';
import {
	hooksGenerateNodesPanelEvent,
	hooksResetNodesPanelSession,
	nodesPanelSession,
} from '@/hooks/utils/hooksNodesPanel';
import { ExternalHooks } from '@/mixins/externalHooks';
import { useSegment } from '@/stores/segment';

export const n8nCloudHooks: ExternalHooks = {
	parameterInput: {
		mount: [
			(meta) => {
				if (!meta.parameter || !meta.inputFieldRef) {
					return;
				}

				if (
					meta.inputFieldRef.$el &&
					(meta.parameter.name === 'resource' || meta.parameter.name === 'operation')
				) {
					const inputField = meta.inputFieldRef.$el.querySelector('input');
					if (inputField && inputField.classList && inputField.classList.value) {
						inputField.classList.value = inputField.classList.value + ' data-hj-allow';
					}
				}
			},
		],
	},
	nodeCreatorSearchBar: {
		mount: [
			(meta) => {
				if (!meta.inputRef) {
					return;
				}

				meta.inputRef.classList.value = meta.inputRef.classList.value + ' data-hj-allow';
			},
		],
	},
	app: {
		mount: [
			() => {
				hooksAddAdminIcon();
			},
			() => {
				hooksAddFakeDoorFeatures();
			},
		],
	},
	nodeView: {
		mount: [
			() => {
				const segmentStore = useSegment();
				segmentStore.identify();
			},
			() => {
				hooksAddAdminIcon();
			},
		],
		createNodeActiveChanged: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					source: meta.source,
					nodes_panel_session_id: nodesPanelSession.sessionId,
				};

				hooksResetNodesPanelSession();
				segmentStore.track('User opened nodes panel', eventData);
				segmentStore.page('Cloud instance', 'Nodes panel', eventData);
			},
		],
		addNodeButton: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User added node to workflow canvas',
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: nodesPanelSession.sessionId,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	main: {
		routeChange: [
			(meta) => {
				const segmentStore = useSegment();
				const splitPath = meta.to.path.split('/');
				if (meta.from.path !== '/' && splitPath[1] === 'workflow') {
					const eventData = {
						workflow_id: splitPath[2],
					};

					segmentStore.page('Cloud instance', 'Workflow editor', eventData);
				}
			},
		],
	},
	credential: {
		saved: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getUserSavedCredentialsEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	credentialsEdit: {
		credentialTypeChanged: [
			(meta) => {
				const segmentStore = useSegment();
				if (meta.newValue) {
					const eventData = {
						eventName: 'User opened Credentials modal',
						properties: {
							source: meta.setCredentialType === meta.credentialType ? 'node' : 'primary_menu',
							new_credential: !meta.editCredentials,
							credential_type: meta.credentialType,
						},
					};

					segmentStore.track(eventData.eventName, eventData.properties);
					segmentStore.page('Cloud instance', 'Credentials modal', eventData.properties);
				}
			},
		],
		credentialModalOpened: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User opened Credentials modal',
					properties: {
						source: meta.activeNode ? 'node' : 'primary_menu',
						new_credential: !meta.isEditingCredential,
						credential_type: meta.credentialType,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
				segmentStore.page('Cloud instance', 'Credentials modal', eventData.properties);
			},
		],
	},
	credentialsList: {
		mounted: [
			() => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User opened global Credentials panel',
				};

				segmentStore.track(eventData.eventName);
				segmentStore.page('Cloud instance', 'Credentials panel');
			},
		],
		dialogVisibleChanged: [
			(meta) => {
				const segmentStore = useSegment();
				if (meta.dialogVisible) {
					const eventData = {
						eventName: 'User opened global Credentials panel',
					};

					segmentStore.track(eventData.eventName);
					segmentStore.page('Cloud instance', 'Credentials panel');
				}
			},
		],
	},
	workflowSettings: {
		dialogVisibleChanged: [
			(meta) => {
				const segmentStore = useSegment();
				if (meta.dialogVisible) {
					const eventData = getOpenWorkflowSettingsEventData();
					segmentStore.track(eventData.eventName, eventData.properties);
				}
			},
		],
		saveSettings: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getUpdatedWorkflowSettingsEventData(meta);
				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	dataDisplay: {
		onDocumentationUrlClick: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User clicked node modal docs link',
					properties: {
						node_type: meta.nodeType.name.split('.')[1],
						docs_link: meta.documentationUrl,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		nodeTypeChanged: [
			(meta) => {
				const segmentStore = useSegment();
				const store = useNDVStore();
				const eventData = getNodeTypeChangedEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
				segmentStore.page('Cloud instance', 'Node modal', {
					node: store.activeNode?.name,
				});
			},
		],
		nodeEditingFinished: [
			() => {
				const segmentStore = useSegment();
				const ndvStore = useNDVStore();
				const workflowsStore = useWorkflowsStore();

				const eventData = getNodeEditingFinishedEventData(ndvStore.activeNode);
				if (eventData) {
					eventData.properties!.workflow_id = workflowsStore.workflowId;
				}

				if (eventData) {
					segmentStore.track(eventData.eventName, eventData.properties);
				}
			},
		],
	},
	executionsList: {
		openDialog: [
			() => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User opened Executions log',
				};

				segmentStore.track(eventData.eventName);
				segmentStore.page('Cloud instance', 'Executions log');
			},
		],
	},
	showMessage: {
		showError: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'Instance FE emitted error',
					properties: {
						error_title: meta.title,
						error_description: meta.message,
						error_message: meta.errorMessage,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	expressionEdit: {
		itemSelected: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getInsertedItemFromExpEditorEventData(meta);

				if (meta.selectedItem.variable.startsWith('Object.keys')) {
					eventData.properties!.variable_type = 'Keys';
				} else if (meta.selectedItem.variable.startsWith('Object.values')) {
					eventData.properties!.variable_type = 'Values';
				} else {
					eventData.properties!.variable_type = 'Raw value';
				}

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		dialogVisibleChanged: [
			(meta) => {
				const segmentStore = useSegment();
				const currentValue = meta.value.slice(1);
				let isValueDefault = false;

				switch (typeof meta.parameter.default) {
					case 'boolean':
						isValueDefault =
							(currentValue === 'true' && meta.parameter.default) ||
							(currentValue === 'false' && !meta.parameter.default);
						break;
					case 'string':
						isValueDefault = currentValue === meta.parameter.default;
						break;
					case 'number':
						isValueDefault = currentValue === meta.parameter.default.toString();
						break;
				}

				const eventData = getExpressionEditorEventsData(meta, isValueDefault);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	nodeSettings: {
		valueChanged: [
			(meta) => {
				const segmentStore = useSegment();
				if (meta.parameterPath !== 'authentication') {
					return;
				}

				const eventData = getAuthenticationModalEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		credentialSelected: [
			(meta) => {
				const segmentStore = useSegment();
				const creds = Object.keys(meta.updateInformation.properties.credentials || {});
				if (creds.length < 1) {
					return;
				}

				const eventData = {
					eventName: 'User selected credential from node modal',
					properties: {
						credential_name: meta.updateInformation.properties.credentials[creds[0]],
						credential_type: creds[0],
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	workflowRun: {
		runWorkflow: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getExecutionStartedEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		runError: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: meta.nodeName
						? 'Node execution finished'
						: 'Manual workflow execution finished',
					properties: {
						preflight: 'true',
						status: 'failed',
						error_message: meta.errorMessages.join('<br />&nbsp;&nbsp;- '),
						error_timestamp: new Date(),
						node_name: meta.nodeName,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	runData: {
		displayModeChanged: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getOutputModeChangedEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	pushConnection: {
		executionFinished: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getExecutionFinishedEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	node: {
		deleteNode: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = getNodeRemovedEventData(meta);

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	workflow: {
		activeChange: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						workflow_id: meta.workflowId,
						source: 'workflow_modal',
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		activeChangeCurrent: [
			(meta) => {
				const segmentStore = useSegment();
				const store = useWorkflowsStore();

				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						source: 'main nav',
						workflow_id: meta.workflowId,
						workflow_name: store.workflowName,
						workflow_nodes: store.allNodes.map((n) => n.type.split('.')[1]),
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		afterUpdate: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User saved workflow',
					properties: {
						workflow_id: meta.workflowData.id,
						workflow_name: meta.workflowData.workflowName,
						workflow_nodes: meta.workflowData.nodes.map((n) => n.type.split('.')[1]),
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	execution: {
		open: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User opened read-only execution',
					properties: {
						workflow_id: meta.workflowId,
						workflow_name: meta.workflowName,
						execution_id: meta.executionId,
					},
				};

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
	},
	nodeCreateList: {
		destroyed: [
			() => {
				const segmentStore = useSegment();
				if (
					nodesPanelSession.data.nodeFilter.length > 0 &&
					nodesPanelSession.data.nodeFilter !== ''
				) {
					const eventData = hooksGenerateNodesPanelEvent();

					segmentStore.track(eventData.eventName, eventData.properties);
				}
			},
		],
		selectedTypeChanged: [
			(meta) => {
				const segmentStore = useSegment();
				const eventData = {
					eventName: 'User changed nodes panel filter',
					properties: {
						old_filter: meta.oldValue,
						new_filter: meta.newValue,
						nodes_panel_session_id: nodesPanelSession.sessionId,
					},
				};
				nodesPanelSession.data.filterMode = meta.newValue;

				segmentStore.track(eventData.eventName, eventData.properties);
			},
		],
		nodeFilterChanged: [
			(meta) => {
				const segmentStore = useSegment();
				if (meta.newValue.length === 0 && nodesPanelSession.data.nodeFilter.length > 0) {
					const eventData = hooksGenerateNodesPanelEvent();

					segmentStore.track(eventData.eventName, eventData.properties);
				}

				if (meta.newValue.length > meta.oldValue.length) {
					nodesPanelSession.data.nodeFilter = meta.newValue;
					nodesPanelSession.data.resultsNodes = meta.filteredNodes.map((node) => {
						if (node.name) {
							return node.name.split('.')[1];
						} else if (node.key) {
							return node.key.split('.')[1];
						}
						return '';
					});
				}
			},
		],
	},
};
