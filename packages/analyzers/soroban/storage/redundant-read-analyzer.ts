import { Injectable, Logger } from '@nestjs/common';
import { ASTNode, ContractDefinition } from '@gasguard/parser';

export interface RedundantReadFinding {
  ruleId: string;
  severity: 'medium' | 'low';
  message: string;
  nodeId?: string;
  recommendation: string;
}

export interface RedundantReadAnalysisResult {
  contractPath: string;
  findings: RedundantReadFinding[];
  metrics: {
    redundantReadsDetected: number;
  };
}

@Injectable()
export class SorobanRedundantReadAnalyzer {
  private readonly logger = new Logger(SorobanRedundantReadAnalyzer.name);

  public analyze(contractAst: ContractDefinition, contractPath: string): RedundantReadAnalysisResult {
    this.logger.debug(`Analyzing redundant storage reads for contract: ${contractPath}`);

    const findings: RedundantReadFinding[] = [];
    let redundantReadsDetected = 0;

    // Track storage read keys within function scopes to detect duplicates without intervening writes
    this.traverseFunctions(contractAst, (functionNode) => {
      const readKeys = new Set<string>();
      const modifiedKeys = new Set<string>();

      this.traverseAst(functionNode, (node) => {
        if (this.isStorageWrite(node)) {
          const key = this.extractStorageKey(node);
          if (key) {
            modifiedKeys.add(key);
            readKeys.delete(key); // Reset tracking if key is modified (avoids false positives for refreshed values)
          }
        }

        if (this.isStorageRead(node)) {
          const key = this.extractStorageKey(node);
          if (key) {
            if (readKeys.has(key) && !modifiedKeys.has(key)) {
              redundantReadsDetected++;
              findings.push({
                ruleId: 'SOROBAN-STOR-04',
                severity: 'medium',
                message: `Redundant storage read detected for key '${key}' within the same execution path.`,
                nodeId: node.id,
                recommendation: 'Cache the storage value in a local variable upon the first read and reuse it throughout the function scope.',
              });
            } else {
              readKeys.add(key);
            }
          }
        }
      });
    });

    return {
      contractPath,
      findings,
      metrics: {
        redundantReadsDetected,
      },
    };
  }

  private traverseFunctions(node: ASTNode, callback: (node: ASTNode) => void): void {
    if (node.type === 'FunctionDefinition' || node.type === 'MethodDefinition') {
      callback(node);
    }
    if (node.children) {
      for (const child of node.children) {
        this.traverseFunctions(child, callback);
      }
    }
  }

  private traverseAst(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);
    if (node.children) {
      for (const child of node.children) {
        this.traverseAst(child, callback);
      }
    }
  }

  private isStorageRead(node: ASTNode): boolean {
    return node.type === 'MethodCall' && (node.value === 'get' || node.value === 'has');
  }

  private isStorageWrite(node: ASTNode): boolean {
    return node.type === 'MethodCall' && (node.value === 'set' || node.value === 'put');
  }

  private extractStorageKey(node: ASTNode): string | null {
    return node.metadata?.['storageKey'] ?? node.arguments?.[0]?.value ?? null;
  }
}