# Prompt Templates

This directory holds versioned LLM prompt templates used by the AI pipeline.

## Convention

- One file per prompt, named `{purpose}.{version}.yaml`
- Templates use Jinja2 syntax for variable interpolation
- Each file includes metadata (model requirements, token budget, etc.)

## Example Structure

```yaml
# jd_parser.v1.yaml
name: jd_parser
version: 1
description: Parse a job description into structured fields
model_requirements:
  min_context_window: 4096
  structured_output: true
template: |
  You are a job description parser. Extract the following fields...
  
  Job Description:
  {{ job_description }}
  
  Output the result as JSON matching this schema:
  {{ schema }}
```

## Adding a New Prompt

1. Create a new YAML file following the naming convention
2. Include all required metadata fields
3. Test with the eval harness before merging
4. Bump the version number for any behavioral changes
