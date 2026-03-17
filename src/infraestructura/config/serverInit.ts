import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import path from 'path';
import { createServer, startServer } from './server';
import { connectDatabase } from './database';
import { ResolverFactory } from '../graphql/resolvers/ResolverFactory';
import { logger } from '../logging';
// Importar modelos MongoDB para asegurar su registro
import '../persistencia/mongo';

export const initializeServer = async (): Promise<void> => {
  await connectDatabase();

  // Resolver ruta de schemas GraphQL de forma robusta
  // En desarrollo usa src/, en producción compilada usa dist/
  const schemasPath = process.env['NODE_ENV'] === 'production'
    ? path.join(process.cwd(), 'dist/infraestructura/graphql/schemas/**/*.graphql')
    : path.join(process.cwd(), 'src/infraestructura/graphql/schemas/**/*.graphql');

  const typesArray = loadFilesSync(schemasPath, { ignoreIndex: true });
  
  // DEBUG: Log para verificar que DateTime está en el schema
  const typeDefs = mergeTypeDefs(typesArray);
  const schemaString = JSON.stringify(typeDefs);
  logger.info('Schema cargado - verificando DateTime', {
    hasDateTime: schemaString.includes('scalar DateTime'),
    hasUpload: schemaString.includes('scalar Upload'),
    totalFiles: typesArray.length,
    schemasPath: schemasPath
  });
  
  const resolvers = mergeResolvers(ResolverFactory.createResolvers() as unknown as Parameters<typeof mergeResolvers>[0]);

  const { app, httpServer, apolloServer } = createServer(resolvers, typeDefs);
  await startServer(app, httpServer, apolloServer);
  logger.info('Servidor de autenticación y usuarios iniciado correctamente');
};

