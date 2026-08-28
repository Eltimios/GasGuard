import { SorobanStorageAnalyzer } from '../storage-analyzer';
import { ContractDefinition } from '@gasguard/parser';

describe('SorobanStorageAnalyzer', () => {
  let analyzer: SorobanStorageAnalyzer;

  beforeEach(() => {
    analyzer = new SorobanStorageAnalyzer();
  });

  it('should detect frequent storage writes inside loops', () => {
    const mockAst: ContractDefinition = {
      type: 'Contract',
      name: 'TestContract',
      children: [
        {
          type: 'ForStatement',
          children: [
            {
              type: 'MethodCall',
              value: 'set',
            },
          ],
        },
      ],
    };

    const result = analyzer.analyze(mockAst, 'contracts/test.rs');

    expect(result.metrics.frequentWritesDetected).toBe(1);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'SOROBAN-STOR-01',
        severity: 'high',
      }),
    );
  });

  it('should identify unnecessary redundant reads', () => {
    const mockAst: ContractDefinition = {
      type: 'Contract',
      name: 'TestContract',
      children: [
        {
          type: 'MethodCall',
          value: 'get',
          metadata: { isRepeatedLookup: true },
        },
      ],
    };

    const result = analyzer.analyze(mockAst, 'contracts/test.rs');

    expect(result.metrics.unnecessaryReadsDetected).toBe(1);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'SOROBAN-STOR-02',
        severity: 'medium',
      }),
    );
  });
});