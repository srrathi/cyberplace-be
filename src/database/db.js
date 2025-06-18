const { logger } = require('../utils/logger');
const { getSupabaseClient } = require('./config');

// Abstract database methods with error handling
class DatabaseService {
    constructor() {
        this.client = getSupabaseClient;
    }

    async findById(table, id, idColumn = 'id') {
        try {
            const { data, error } = await this.client().from(table).select('*').eq(idColumn, id).single();
            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Error finding ${table} by ${idColumn}:`, error);
            throw new Error(`Failed to find ${table}: ${error.message}`);
        }
    }

    async findMany(table, filters = {}, options = {}) {
        try {
            let query = this.client().from(table).select(options.select || '*');

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });

            if (options.orderBy) {
                query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Error finding ${table}:`, error);
            throw new Error(`Failed to find ${table}: ${error.message}`);
        }
    }

    async create(table, data) {
        try {
            const { data: result, error } = await this.client().from(table).insert(data).select().single();
            if (error) throw error;
            return result;
        } catch (error) {
            logger.error(`Error creating ${table}:`, error);
            throw new Error(`Failed to create ${table}: ${error.message}`);
        }
    }

    async update(table, id, data, idColumn = 'id') {
        try {
            const { data: result, error } = await this.client().from(table).update(data).eq(idColumn, id).select().single();
            if (error) throw error;
            return result;
        } catch (error) {
            logger.error(`Error updating ${table}:`, error);
            throw new Error(`Failed to update ${table}: ${error.message}`);
        }
    }

    async delete(table, id, idColumn = 'id') {
        try {
            const { error } = await this.client().from(table).delete().eq(idColumn, id);
            if (error) throw error;
            return true;
        } catch (error) {
            logger.error(`Error deleting ${table}:`, error);
            throw new Error(`Failed to delete ${table}: ${error.message}`);
        }
    }

    async executeQuery(query) {
        try {
            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error executing query:', error);
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    async executeRawQuery(sql, params = []) {
        try {
            const { data, error } = await this.client().rpc('execute_sql', {
                sql_query: sql,
                params: params
            });
            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error executing raw query:', error);
            throw new Error(`Raw query execution failed: ${error.message}`);
        }
    }
}

module.exports = {
    DatabaseService
}