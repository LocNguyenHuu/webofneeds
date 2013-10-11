package at.researchstudio.sat.solrintervals;

import org.apache.lucene.document.Document;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.TopDocs;
import org.apache.solr.client.solrj.SolrServerException;
import org.apache.solr.client.solrj.embedded.EmbeddedSolrServer;
import org.apache.solr.common.SolrInputDocument;
import org.apache.solr.core.CoreContainer;
import org.apache.solr.core.SolrCore;
import org.apache.solr.schema.SchemaField;
import org.apache.solr.search.SolrIndexReader;
import org.apache.solr.search.SolrIndexSearcher;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;
import org.xml.sax.SAXException;

import javax.xml.parsers.ParserConfigurationException;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * User: atus
 * Date: 11.10.13
 */
public class TimeIntervalTest
{
  private static final String SOLR_CORE_NAME = "main";

  static CoreContainer coreContainer = null;
  static SolrIndexSearcher searcher = null;
  static SolrIndexReader reader = null;

  static List<SolrInputDocument> testDocuments = null;

  @BeforeClass
  public static void setup() throws IOException, SAXException, ParserConfigurationException, SolrServerException, InterruptedException
  {
    System.setProperty("solr.solr.home", "src/test/resources/solr");

    deleteIndexDir();

    //now start solr
    CoreContainer.Initializer initializer = new CoreContainer.Initializer();
    CoreContainer coreContainer = initializer.initialize();

    EmbeddedSolrServer server = new EmbeddedSolrServer(coreContainer, SOLR_CORE_NAME);

    testDocuments = getTestData();
    server.add(testDocuments);
    System.out.println("test documents added to solr server, waiting for commit..");

    server.commit(true, true);
    System.out.println("solr commit done, continuing");

    SolrCore core = coreContainer.getCore(SOLR_CORE_NAME);
    searcher = core.newSearcher("test");
    reader = searcher.getReader();
  }

  private static void deleteIndexDir()
  {
    //first, delete the index dir if it's there
    File indexDir = new File(System.getProperty("solr.solr.home"), "data/index");
    if (indexDir.exists()) {
      System.out.println("deleting index dir: " + indexDir);
      File[] indexDirContents = indexDir.listFiles();
      boolean deleteSuccessful = true;
      for (int i = 0; i < indexDirContents.length && deleteSuccessful; i++) {
        deleteSuccessful = indexDirContents[i].delete();
      }
      deleteSuccessful = indexDir.delete();
      if (deleteSuccessful) {
        System.out.println("index dir deleted");
      } else {
        System.out.println("failed to delete index dir");
      }
    }
  }

  @AfterClass
  public static void tearDown() throws InterruptedException
  {
    if (searcher != null) {
      try {
        searcher.close();
      } catch (IOException e) {
        e.printStackTrace();
      }
    }

    if (coreContainer != null) {
      coreContainer.shutdown();
    }
  }

  @Test
  public void readIndex() throws IOException
  {
    int docs= reader.numDocs();

    for(int i = 0; i < docs; i++) {
      Document doc = reader.document(i);
      String interval = doc.get("timeInterval");
      System.out.print(interval);
      Assert.assertTrue(interval.length() > 0);
    }
  }

  @Test
  public void intervalQuery() throws IOException
  {
    SchemaField schemaField = searcher.getSchema().getField("timeInterval");

    Query q = schemaField.getType().getRangeQuery(null, schemaField, "50","150",true,true);
    TopDocs results = searcher.search(q, 5);
    System.out.print(reader.document(results.scoreDocs[0].doc).toString());
  }

  private static List<SolrInputDocument> getTestData()
  {
    List<SolrInputDocument> docs = new ArrayList<>();

    SolrInputDocument doc1 = new SolrInputDocument();
    doc1.addField("id", 1);
    doc1.addField("title", "Example 1");
    long start = System.currentTimeMillis();
    long end = System.currentTimeMillis() + (90 * 60 * 1000);
    String s = Long.toString(start) + "-" + Long.toString(end);
    doc1.addField("timeInterval","100-200");
    //"2013-08-01T00:01:00.000Z"
    //"2013-08-30T23:00:00.000Z"

    docs.add(doc1);

    return docs;
  }
}
