import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { extractSchemaFields, parseField, simplify } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'SQL Query',
		name: 'sqlQuery',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['query'],
				resource: ['record'],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM dataset.table LIMIT 100',
		description:
			'SQL query to execute, more info <a href="https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax" target="_blank">here</a>',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['query'],
				resource: ['record'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['query'],
				resource: ['record'],
			},
		},
		options: [
			{
				displayName: 'Default Dataset Name or ID',
				name: 'defaultDataset',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDatasets',
					loadOptionsDependsOn: ['projectId'],
				},
				default: '',
				description:
					'If not set, all table names in the query string must be qualified in the format \'datasetId.tableId\'. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Dry Run',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description:
					"Whether set to true BigQuery doesn't run the job. Instead, if the query is valid, BigQuery returns statistics about the job such as how many bytes would be processed. If the query is invalid, an error returns.",
			},
			{
				displayName: 'Maximum Bytes Billed',
				name: 'maximumBytesBilled',
				type: 'string',
				default: '',
				description:
					'Limits the bytes billed for this query. Queries with bytes billed above this limit will fail (without incurring a charge). String in <a href="https://developers.google.com/discovery/v1/type-format?utm_source=cloud.google.com&utm_medium=referral" target="_blank">Int64Value</a> format',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 1000,
				description: 'The maximum number of rows of data to return',
			},
			{
				displayName: 'Timeout',
				name: 'timeoutMs',
				type: 'number',
				default: 10000,
				description: 'How long to wait for the query to complete, in milliseconds',
			},
			{
				displayName: 'Use Legacy SQL',
				name: 'useLegacySql',
				type: 'boolean',
				default: true,
				description:
					"Whether to use BigQuery's legacy SQL dialect for this query. The default value is true. If set to false, the query will use BigQuery's standard SQL",
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
	let responseData;

	const projectId = this.getNodeParameter('projectId', index) as string;
	const sqlQuery = this.getNodeParameter('sqlQuery', index) as string;
	const simple = this.getNodeParameter('simple', index) as boolean;
	const options = this.getNodeParameter('options', index);

	const qs: IDataObject = options;
	qs.query = sqlQuery;

	if (qs.defaultDataset) {
		qs.defaultDataset = {
			datasetId: options.defaultDataset,
			projectId,
		};
	}

	const response = await googleApiRequest.call(
		this,
		'POST',
		`/v2/projects/${projectId}/queries`,
		qs,
	);

	if (!qs.dryRun) {
		const { rows, schema } = response;

		let fields = (schema.fields || []).map((field: IDataObject) => extractSchemaFields(field));
		responseData = rows;

		if (qs.selectedFields) {
			fields = (fields as string[]).map((field: string) => parseField(field));
		}

		responseData = simple ? simplify(responseData, fields) : responseData;
	} else {
		responseData = response;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}